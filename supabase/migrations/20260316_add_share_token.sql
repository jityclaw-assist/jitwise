-- Add share_token to estimations for public shareable links
ALTER TABLE estimations
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_estimations_share_token
  ON estimations (share_token)
  WHERE share_token IS NOT NULL;

-- Allow anonymous reads when share_token is set (for public share pages)
CREATE POLICY "Public read by share_token"
  ON estimations
  FOR SELECT
  USING (share_token IS NOT NULL);
