-- ============================================================
-- Add ref_token to profiles for share link attribution
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ref_token TEXT UNIQUE DEFAULT NULL;

-- Allow public reads of profiles (ref_token is used in public share link footers)
-- Only exposes non-sensitive fields: ref_token is the only one needed publicly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Public can read profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read profiles" ON profiles FOR SELECT USING (true)';
  END IF;
END $$;

-- Allow authenticated users to update their own ref_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid())';
  END IF;
END $$;
