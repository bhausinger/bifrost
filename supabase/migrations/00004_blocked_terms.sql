-- Blocked terms for filtering discovery/scraper results
-- Types: 'email_domain' (blocks emails with matching domain) and 'profile_name' (blocks artist names containing term)
CREATE TABLE IF NOT EXISTS blocked_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_domain', 'profile_name')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Prevent duplicate term+type combinations
CREATE UNIQUE INDEX IF NOT EXISTS blocked_terms_term_type_idx ON blocked_terms(lower(term), type);

-- RLS: all authenticated users can read and manage blocked terms
ALTER TABLE blocked_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read blocked terms"
  ON blocked_terms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert blocked terms"
  ON blocked_terms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blocked terms"
  ON blocked_terms FOR DELETE
  TO authenticated
  USING (true);
