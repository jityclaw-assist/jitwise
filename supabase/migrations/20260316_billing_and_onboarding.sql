-- ============================================================
-- Billing fields on profiles
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS advisor_uses_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advisor_month_reset DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_project_type TEXT DEFAULT NULL;

-- ============================================================
-- Referrals table
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ref_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'pending_activation', 'activated', 'rewarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrer can read own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_referrals_ref_token ON referrals (ref_token);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals (referred_id);
