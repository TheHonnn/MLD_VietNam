-- ==============================================================================
-- MLD VIỆT NAM - DATABASE MIGRATION 031: TREATMENT LIFECYCLE MANAGEMENT
-- Chuẩn hóa toàn diện vòng đời gói liệu trình, sổ hoàn tác buổi an toàn,
-- hồ sơ chuyên môn mở rộng, vật tư tiêu hao và đối soát hoa hồng/kho.
-- ==============================================================================

-- 1. MỞ RỘNG ENUM PACKAGE_STATUS
DO $$ BEGIN
  ALTER TYPE package_status ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
  ALTER TYPE package_status ADD VALUE IF NOT EXISTS 'TRANSFERRED';
  ALTER TYPE package_status ADD VALUE IF NOT EXISTS 'REFUNDED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. BỔ SUNG CỘT VẬN HÀNH VÒNG ĐỜI VÀO USER_PACKAGES
ALTER TABLE public.user_packages
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS transferred_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_reason TEXT,
  ADD COLUMN IF NOT EXISTS transferred_from_package_id UUID REFERENCES public.user_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS extension_months INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. BẢNG USER_PACKAGE_LIFECYCLE_LOGS (Nhật ký bất biến biến động trạng thái gói)
CREATE TABLE IF NOT EXISTS public.user_package_lifecycle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_package_id UUID NOT NULL REFERENCES public.user_packages(id) ON DELETE RESTRICT,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'PAUSE', 'RESUME', 'EXTEND_EXPIRY', 'CANCEL', 'TRANSFER', 'REFUND', 'SESSION_REVERSED'
  reason TEXT NOT NULL,
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  idempotency_key VARCHAR(128),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_package_lifecycle_pkg
  ON public.user_package_lifecycle_logs(user_package_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_package_lifecycle_action
  ON public.user_package_lifecycle_logs(action, performed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_package_lifecycle_idempotency
  ON public.user_package_lifecycle_logs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 4. MỞ RỘNG BẢNG TREATMENT_JOURNAL (Hồ sơ chuyên môn, phản ứng bất thường, vật tư, ảnh & hoàn tác)
ALTER TABLE public.treatment_journal
  ADD COLUMN IF NOT EXISTS treatment_areas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_goals TEXT,
  ADD COLUMN IF NOT EXISTS treatment_protocol TEXT,
  ADD COLUMN IF NOT EXISTS technical_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consumables_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS has_abnormal_reaction BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS adverse_reactions TEXT,
  ADD COLUMN IF NOT EXISTS clinical_approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS clinical_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
  ADD COLUMN IF NOT EXISTS reversal_id UUID,
  ADD COLUMN IF NOT EXISTS photos_metadata JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS home_care_instructions TEXT,
  ADD COLUMN IF NOT EXISTS post_care_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS next_session_recommended_at DATE,
  ADD COLUMN IF NOT EXISTS next_session_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_treatment_journal_abnormal
  ON public.treatment_journal(has_abnormal_reaction)
  WHERE has_abnormal_reaction = TRUE;
CREATE INDEX IF NOT EXISTS idx_treatment_journal_reversed
  ON public.treatment_journal(is_reversed)
  WHERE is_reversed = TRUE;

-- 5. BẢNG TREATMENT_SESSION_REVERSALS (Sổ cái hoàn tác buổi điều trị an toàn)
CREATE TABLE IF NOT EXISTS public.treatment_session_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.treatment_journal(id) ON DELETE RESTRICT,
  user_package_id UUID NOT NULL REFERENCES public.user_packages(id) ON DELETE RESTRICT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  session_number INT NOT NULL,
  reason TEXT NOT NULL,
  reversed_by UUID NOT NULL REFERENCES public.users(id),
  reversed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  idempotency_key VARCHAR(128) UNIQUE,
  inventory_reversal_status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
  commission_reversal_status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_session_reversal_journal
  ON public.treatment_session_reversals(journal_id);
CREATE INDEX IF NOT EXISTS idx_session_reversals_pkg
  ON public.treatment_session_reversals(user_package_id, reversed_at DESC);

-- Liên kết khóa ngoại giữa treatment_journal.reversal_id -> treatment_session_reversals.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_treatment_journal_reversal'
      AND conrelid = 'public.treatment_journal'::regclass
  ) THEN
    ALTER TABLE public.treatment_journal
      ADD CONSTRAINT fk_treatment_journal_reversal
      FOREIGN KEY (reversal_id) REFERENCES public.treatment_session_reversals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 6. BẢNG TREATMENT_INVENTORY_OUTBOX (Ranh giới tích hợp kho tiêu hao & hoàn trả vật tư)
CREATE TABLE IF NOT EXISTS public.treatment_inventory_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  treatment_journal_id UUID REFERENCES public.treatment_journal(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  operation_type VARCHAR(30) NOT NULL DEFAULT 'DEDUCT', -- 'DEDUCT', 'REVERSE_RESTORE'
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ name, quantity, unit }]
  sync_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_SYNC', -- 'PENDING_SYNC', 'SYNCED', 'FAILED'
  synced_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_treatment_inventory_outbox_status
  ON public.treatment_inventory_outbox(sync_status, created_at);

-- 7. BẢNG POST_CARE_OUTBOX (Hàng đợi hướng dẫn tự chăm sóc sau buổi cho mobile / kênh ngoài)
CREATE TABLE IF NOT EXISTS public.post_care_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_journal_id UUID NOT NULL REFERENCES public.treatment_journal(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL DEFAULT 'IN_APP', -- 'IN_APP', 'ZALO_ZNS', 'SMS'
  content TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED'
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_care_outbox_customer
  ON public.post_care_outbox(customer_id, status);

-- 8. MỞ RỘNG BẢNG STAFF_COMMISSIONS ĐỂ HỖ TRỢ ĐẢO HOA HỒNG TỪ BUỔI ĐIỀU TRỊ
ALTER TABLE public.staff_commissions
  ADD COLUMN IF NOT EXISTS treatment_journal_id UUID REFERENCES public.treatment_journal(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversal_of_id UUID REFERENCES public.staff_commissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_session_status VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_staff_commissions_journal
  ON public.staff_commissions(treatment_journal_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_commissions_reversal
  ON public.staff_commissions(reversal_of_id)
  WHERE reversal_of_id IS NOT NULL;

-- 9. PHÂN QUYỀN RLS BẢO MẬT
ALTER TABLE public.user_package_lifecycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_session_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_inventory_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_care_outbox ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_package_lifecycle_logs FROM anon;
REVOKE ALL ON public.treatment_session_reversals FROM anon;
REVOKE ALL ON public.treatment_inventory_outbox FROM anon;
REVOKE ALL ON public.post_care_outbox FROM anon;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated read user_package_lifecycle_logs" ON public.user_package_lifecycle_logs;
  DROP POLICY IF EXISTS "Admin read user_package_lifecycle_logs" ON public.user_package_lifecycle_logs;
  CREATE POLICY "Admin read user_package_lifecycle_logs"
    ON public.user_package_lifecycle_logs FOR SELECT TO authenticated
    USING (public.admin_is_super());

  DROP POLICY IF EXISTS "Authenticated read treatment_session_reversals" ON public.treatment_session_reversals;
  DROP POLICY IF EXISTS "Admin read treatment_session_reversals" ON public.treatment_session_reversals;
  CREATE POLICY "Admin read treatment_session_reversals"
    ON public.treatment_session_reversals FOR SELECT TO authenticated
    USING (public.admin_is_super());

  DROP POLICY IF EXISTS "Authenticated read treatment_inventory_outbox" ON public.treatment_inventory_outbox;
  DROP POLICY IF EXISTS "Admin read treatment_inventory_outbox" ON public.treatment_inventory_outbox;
  CREATE POLICY "Admin read treatment_inventory_outbox"
    ON public.treatment_inventory_outbox FOR SELECT TO authenticated
    USING (public.admin_is_super());

  DROP POLICY IF EXISTS "Customer and staff read post_care_outbox" ON public.post_care_outbox;
  CREATE POLICY "Customer and staff read post_care_outbox"
    ON public.post_care_outbox FOR SELECT TO authenticated
    USING (customer_id = auth.uid() OR public.admin_is_super());
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- 10. ĐỒNG BỘ DỮ LIỆU CŨ AN TOÀN (BACKFILL)
UPDATE public.treatment_journal
SET is_reversed = FALSE
WHERE is_reversed IS NULL;

UPDATE public.treatment_journal
SET confirmation_status = 'CONFIRMED'
WHERE confirmation_status IS NULL;

ALTER TABLE public.treatment_journal
  ALTER COLUMN confirmation_status SET DEFAULT 'PENDING',
  ALTER COLUMN confirmation_status SET NOT NULL;

-- Cập nhật trạng thái gói đã hết hạn hoặc đã hoàn tất theo số buổi thực tế
UPDATE public.user_packages
SET status = 'COMPLETED'
WHERE completed_sessions >= total_sessions
  AND status = 'ACTIVE';

UPDATE public.user_packages
SET status = 'EXPIRED'
WHERE expires_at < CURRENT_TIMESTAMP
  AND status = 'ACTIVE'
  AND completed_sessions < total_sessions;
