-- Existing Portal tables can retain older defaults after CREATE TABLE IF NOT EXISTS.
ALTER TABLE public.portal_taxonomies ALTER COLUMN is_active SET DEFAULT FALSE;
ALTER TABLE public.support_faqs ALTER COLUMN is_active SET DEFAULT FALSE;
ALTER TABLE public.legal_policies ALTER COLUMN is_published SET DEFAULT FALSE;

-- Reorder two adjacent banners in one transaction, using the same order as the admin list.
CREATE OR REPLACE FUNCTION public.fn_swap_portal_banners(p_first uuid, p_second uuid)
RETURNS TABLE (updated_count integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  banner_ids uuid[];
  first_position integer;
  second_position integer;
BEGIN
  IF NOT public.admin_is_super() THEN
    RAISE EXCEPTION 'Cần quyền quản trị để sắp xếp banner' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mld-portal-banner-order'));
  PERFORM id FROM public.miniapp_shared_content WHERE kind = 'BANNER' ORDER BY id FOR UPDATE;

  SELECT array_agg(id ORDER BY sort_order ASC NULLS LAST, created_at DESC, id ASC)
    INTO banner_ids FROM public.miniapp_shared_content WHERE kind = 'BANNER';
  first_position := array_position(banner_ids, p_first);
  second_position := array_position(banner_ids, p_second);
  IF first_position IS NULL OR second_position IS NULL OR first_position + 1 <> second_position THEN
    RAISE EXCEPTION 'Thứ tự banner đã thay đổi. Hãy tải lại trước khi sắp xếp.';
  END IF;

  banner_ids[first_position] := p_second;
  banner_ids[second_position] := p_first;
  UPDATE public.miniapp_shared_content AS item
     SET sort_order = ordered.position::integer, updated_at = NOW()
    FROM unnest(banner_ids) WITH ORDINALITY AS ordered(id, position)
   WHERE item.id = ordered.id
     AND (item.id IN (p_first, p_second) OR item.sort_order IS DISTINCT FROM ordered.position::integer);
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count < 2 THEN
    RAISE EXCEPTION 'Không lưu được toàn bộ thứ tự banner.';
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_swap_portal_banners(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_swap_portal_banners(uuid, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
