-- Add Stripe customer ID to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles (stripe_customer_id);
