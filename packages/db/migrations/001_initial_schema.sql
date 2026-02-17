-- ============================================================
-- Agent Office — Initial Schema
-- Run against Supabase Postgres
-- ============================================================

-- ── Enums ──
CREATE TYPE proposal_status AS ENUM ('pending','approved','rejected','needs_review');
CREATE TYPE proposal_source AS ENUM ('api','trigger','reaction');
CREATE TYPE mission_status  AS ENUM ('pending','running','succeeded','failed');
CREATE TYPE step_status     AS ENUM ('queued','running','succeeded','failed');
CREATE TYPE agent_status    AS ENUM ('idle','working','thinking');
CREATE TYPE gate_window     AS ENUM ('daily','hourly');

-- ── Agents ──
CREATE TABLE agents (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  role        text NOT NULL,
  avatar_url  text,
  personality text,
  status      agent_status NOT NULL DEFAULT 'idle',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Agent Affect ──
CREATE TABLE agent_affect (
  agent_id      text PRIMARY KEY REFERENCES agents(id),
  mood          text NOT NULL DEFAULT 'neutral',
  energy        int NOT NULL DEFAULT 100,
  last_activity text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Office State ──
CREATE TABLE office_state (
  agent_id   text PRIMARY KEY REFERENCES agents(id),
  x          int NOT NULL DEFAULT 0,
  y          int NOT NULL DEFAULT 0,
  room       text NOT NULL DEFAULT 'lobby',
  activity   text NOT NULL DEFAULT 'idle',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Proposals ──
CREATE TABLE proposals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text NOT NULL REFERENCES agents(id),
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  status      proposal_status NOT NULL DEFAULT 'pending',
  source      proposal_source NOT NULL DEFAULT 'api',
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_proposals_agent ON proposals(agent_id);
CREATE INDEX idx_proposals_status ON proposals(status);

-- ── Proposal History ──
CREATE TABLE proposal_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  old_status  proposal_status,
  new_status  proposal_status NOT NULL,
  changed_by  text NOT NULL,
  reason      text,
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_proposal_history_proposal ON proposal_history(proposal_id);

-- ── Missions ──
CREATE TABLE missions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  uuid NOT NULL REFERENCES proposals(id),
  status       mission_status NOT NULL DEFAULT 'pending',
  priority     int NOT NULL DEFAULT 0,
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_proposal ON missions(proposal_id);

-- ── Mission Steps ──
CREATE TABLE mission_steps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id   uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  kind         text NOT NULL,
  status       step_status NOT NULL DEFAULT 'queued',
  config       jsonb NOT NULL DEFAULT '{}',
  result       jsonb,
  retry_count  int NOT NULL DEFAULT 0,
  max_retries  int NOT NULL DEFAULT 3,
  reserved_at  timestamptz,
  completed_at timestamptz,
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_steps_mission ON mission_steps(mission_id);
CREATE INDEX idx_steps_status ON mission_steps(status);

-- ── Action Runs ──
CREATE TABLE action_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id     uuid NOT NULL REFERENCES mission_steps(id) ON DELETE CASCADE,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  result      jsonb,
  error       text,
  tokens_used int
);
CREATE INDEX idx_action_runs_step ON action_runs(step_id);

-- ── Agent Events ──
CREATE TABLE agent_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   text NOT NULL REFERENCES agents(id),
  event_type text NOT NULL,
  tags       text[] NOT NULL DEFAULT '{}',
  payload    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_events_agent ON agent_events(agent_id);
CREATE INDEX idx_agent_events_type ON agent_events(event_type);

-- ── Agent Messages ──
CREATE TABLE agent_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent text NOT NULL REFERENCES agents(id),
  to_agent   text NOT NULL REFERENCES agents(id),
  content    text NOT NULL,
  thread_id  uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_messages_thread ON agent_messages(thread_id);

-- ── Agent Usage ──
CREATE TABLE agent_usage (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   text NOT NULL REFERENCES agents(id),
  date       date NOT NULL DEFAULT CURRENT_DATE,
  tokens_in  bigint NOT NULL DEFAULT 0,
  tokens_out bigint NOT NULL DEFAULT 0,
  cost_usd   numeric(12,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_usage_agent_date ON agent_usage(agent_id, date);

-- ── Trigger Rules ──
CREATE TABLE trigger_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  condition       jsonb NOT NULL DEFAULT '{}',
  action_template jsonb NOT NULL DEFAULT '{}',
  cooldown_sec    int NOT NULL DEFAULT 0,
  last_fired_at   timestamptz,
  enabled         bool NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Reaction Matrix ──
CREATE TABLE reaction_matrix (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent  text NOT NULL REFERENCES agents(id),
  event_tags    text[] NOT NULL DEFAULT '{}',
  target_agent  text NOT NULL REFERENCES agents(id),
  reaction_type text NOT NULL,
  probability   float NOT NULL DEFAULT 1.0,
  cooldown_sec  int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Policies ──
CREATE TABLE policies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text UNIQUE NOT NULL,
  value_json jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'system'
);

-- ── Policy History ──
CREATE TABLE policy_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id  uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  old_value  jsonb,
  new_value  jsonb NOT NULL,
  changed_by text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_policy_history_policy ON policy_history(policy_id);

-- ── Cap Gates ──
CREATE TABLE cap_gates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_kind   text NOT NULL,
  gate_type   text NOT NULL,
  limit_value int NOT NULL,
  window      gate_window NOT NULL DEFAULT 'daily',
  enabled     bool NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cap_gates_kind ON cap_gates(step_kind);

-- ── Office Events ──
CREATE TABLE office_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   text NOT NULL REFERENCES agents(id),
  event_type text NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_office_events_agent ON office_events(agent_id);

-- ============================================================
-- Row Level Security — enable on all tables, allow service_role
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'agents','agent_affect','office_state','proposals','proposal_history',
      'missions','mission_steps','action_runs','agent_events','agent_messages',
      'agent_usage','trigger_rules','reaction_matrix','policies','policy_history',
      'cap_gates','office_events'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "service_role_all" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ============================================================
-- Seed — Default Agents
-- ============================================================
INSERT INTO agents (id, name, role, personality, status) VALUES
  ('minion', 'Minion', 'executor',    'Eager and tireless worker bee',    'idle'),
  ('sage',   'Sage',   'strategist',  'Wise and deliberate planner',     'idle'),
  ('scout',  'Scout',  'researcher',  'Curious and fast information gatherer', 'idle'),
  ('quill',  'Quill',  'writer',      'Creative wordsmith with flair',   'idle'),
  ('xalt',   'Xalt',   'analyst',     'Data-driven and precise',         'idle'),
  ('observer','Observer','monitor',   'Watchful and detail-oriented',    'idle');

INSERT INTO agent_affect (agent_id, mood, energy) VALUES
  ('minion','eager',100),('sage','calm',100),('scout','curious',100),
  ('quill','inspired',100),('xalt','focused',100),('observer','watchful',100);

INSERT INTO office_state (agent_id, x, y, room, activity) VALUES
  ('minion',2,3,'workshop','idle'),('sage',5,1,'library','idle'),
  ('scout',8,4,'field','idle'),('quill',3,6,'studio','idle'),
  ('xalt',7,2,'lab','idle'),('observer',1,1,'watchtower','idle');
