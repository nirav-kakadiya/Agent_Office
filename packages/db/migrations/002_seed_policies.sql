-- ============================================================
-- Phase 3: Seed default policies
-- ============================================================

INSERT INTO policies (key, value_json, updated_by) VALUES
  ('auto_approve_rules', '{"max_pending_per_agent": 3, "max_cost_usd": 1.0, "auto_sources": ["trigger", "reaction"]}', 'system'),
  ('retry_config', '{"base_delay_ms": 1000, "max_delay_ms": 30000, "default_max_retries": 3}', 'system'),
  ('stale_timeout_minutes', '{"value": 5}', 'system'),
  ('worker_concurrency', '{"value": 3}', 'system')
ON CONFLICT (key) DO NOTHING;

-- Add last_fired_at to reaction_matrix for cooldown tracking
ALTER TABLE reaction_matrix ADD COLUMN IF NOT EXISTS last_fired_at timestamptz;
