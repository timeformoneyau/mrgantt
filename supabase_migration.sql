-- Run this in Supabase SQL Editor (project: mrgant)
-- Adds name and updated_at columns, migrates existing row

ALTER TABLE gantt_plans
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Untitled',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Give the existing Qantas/ColCap plan its real name
UPDATE gantt_plans SET name = 'Qantas ColCap Implementation', updated_at = now() WHERE id = 1;

-- Auto-update updated_at on every save
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gantt_plans_updated_at ON gantt_plans;
CREATE TRIGGER gantt_plans_updated_at
  BEFORE UPDATE ON gantt_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
