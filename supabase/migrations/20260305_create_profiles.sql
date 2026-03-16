-- ============================================================
-- Profiles table
-- Linked 1:1 to auth.users. Created on registration via trigger.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Billing
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro')),
  plan_expires_at TIMESTAMPTZ DEFAULT NULL,
  advisor_uses_this_month INTEGER NOT NULL DEFAULT 0,
  advisor_month_reset DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Onboarding
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_project_type TEXT DEFAULT NULL,

  -- Referrals
  ref_token TEXT UNIQUE DEFAULT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read and update their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Public read (needed for share link ref_token attribution)
CREATE POLICY "Public can read profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- ============================================================
-- Trigger: auto-insert a profile row when a new user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Referrals table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ref_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'pending_activation', 'activated', 'rewarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrer can read own referrals"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_referrals_ref_token ON public.referrals (ref_token);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals (referred_id);
