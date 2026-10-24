-- Enable staff manage policies for branches and related operational tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'Staff manage branches') THEN
    CREATE POLICY "Staff manage branches" ON branches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branch_rooms' AND policyname = 'Staff manage branch_rooms') THEN
    CREATE POLICY "Staff manage branch_rooms" ON branch_rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'technicians' AND policyname = 'Staff manage technicians') THEN
    CREATE POLICY "Staff manage technicians" ON technicians FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_profiles' AND policyname = 'Staff manage staff_profiles') THEN
    CREATE POLICY "Staff manage staff_profiles" ON staff_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
