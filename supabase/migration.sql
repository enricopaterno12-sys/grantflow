-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  name TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,

  -- Legacy snapshot JSONB
  data JSONB DEFAULT '{}'::jsonb,

  -- Explicit columns per tab (JSONB)
  esito_calcolato JSONB DEFAULT NULL,
  analisi_concisa JSONB DEFAULT NULL,
  company_data JSONB DEFAULT NULL,
  bando_info JSONB DEFAULT NULL,
  vincoli_bando JSONB DEFAULT NULL,
  calcolo_finanziario JSONB DEFAULT NULL,
  business_plan_data JSONB DEFAULT NULL,
  checklist_pratica JSONB DEFAULT NULL,

  -- Text fields
  custom_prompt TEXT DEFAULT NULL
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_is_pinned ON analyses (is_pinned DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_analyses_updated_at ON analyses;
CREATE TRIGGER trg_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: allow all operations for authenticated/anonymous users
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Policy: allow all for service role / anon key (bypasses RLS)
DROP POLICY IF EXISTS "Enable all for all users" ON analyses;
CREATE POLICY "Enable all for all users" ON analyses
  FOR ALL
  USING (true)
  WITH CHECK (true);
