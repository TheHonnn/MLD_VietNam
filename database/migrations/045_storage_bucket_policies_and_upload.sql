DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can view storage objects" ON storage.objects;
    CREATE POLICY "Public can view storage objects"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id IN ('avatars', 'services', 'documents'));

    DROP POLICY IF EXISTS "Public and authenticated can upload objects" ON storage.objects;
    CREATE POLICY "Public and authenticated can upload objects"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id IN ('avatars', 'services', 'documents'));

    DROP POLICY IF EXISTS "Public and authenticated can update objects" ON storage.objects;
    CREATE POLICY "Public and authenticated can update objects"
    ON storage.objects FOR UPDATE
    TO anon, authenticated
    USING (bucket_id IN ('avatars', 'services', 'documents'));

    DROP POLICY IF EXISTS "Public and authenticated can delete objects" ON storage.objects;
    CREATE POLICY "Public and authenticated can delete objects"
    ON storage.objects FOR DELETE
    TO anon, authenticated
    USING (bucket_id IN ('avatars', 'services', 'documents'));

    DROP POLICY IF EXISTS "Public can view public buckets" ON storage.buckets;
    CREATE POLICY "Public can view public buckets"
    ON storage.buckets FOR SELECT
    TO anon, authenticated
    USING (public = true);
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
