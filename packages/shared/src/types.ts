// ── Enums ──
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';
export type ProposalSource = 'api' | 'trigger' | 'reaction';
export type MissionStatus = 'pending' | 'running' | 'succeeded' | 'failed';
export type StepStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type AgentStatus = 'idle' | 'working' | 'thinking';
export type GateWindow = 'daily' | 'hourly';

// ── Core Models ──
export interface Proposal {
  id: string;
  agent_id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  source: ProposalSource;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProposalHistory {
  id: string;
  proposal_id: string;
  old_status: ProposalStatus | null;
  new_status: ProposalStatus;
  changed_by: string;
  reason: string | null;
  changed_at: string;
}

export interface Mission {
  id: string;
  proposal_id: string;
  status: MissionStatus;
  priority: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface MissionStep {
  id: string;
  mission_id: string;
  kind: string;
  status: StepStatus;
  config: Record<string, unknown>;
  result: Record<string, unknown> | null;
  retry_count: number;
  max_retries: number;
  reserved_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  personality: string | null;
  status: AgentStatus;
  created_at: string;
}

export interface AgentEvent {
  id: string;
  agent_id: string;
  event_type: string;
  tags: string[];
  payload: Record<string, unknown>;
  created_at: string;
}

export interface AgentMessage {
  id: string;
  from_agent: string;
  to_agent: string;
  content: string;
  thread_id: string | null;
  created_at: string;
}

export interface AgentUsage {
  id: string;
  agent_id: string;
  date: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
}

export interface AgentAffect {
  agent_id: string;
  mood: string;
  energy: number;
  last_activity: string | null;
  updated_at: string;
}

export interface TriggerRule {
  id: string;
  name: string;
  condition: Record<string, unknown>;
  action_template: Record<string, unknown>;
  cooldown_sec: number;
  last_fired_at: string | null;
  enabled: boolean;
  created_at: string;
}

export interface ReactionMatrix {
  id: string;
  source_agent: string;
  event_tags: string[];
  target_agent: string;
  reaction_type: string;
  probability: number;
  cooldown_sec: number;
  created_at: string;
}

export interface ActionRun {
  id: string;
  step_id: string;
  started_at: string;
  finished_at: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  tokens_used: number | null;
}

export interface Policy {
  id: string;
  key: string;
  value_json: Record<string, unknown>;
  updated_at: string;
  updated_by: string;
}

export interface PolicyHistory {
  id: string;
  policy_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
  changed_by: string;
  changed_at: string;
}

export interface CapGate {
  id: string;
  step_kind: string;
  gate_type: string;
  limit_value: number;
  window: GateWindow;
  enabled: boolean;
  created_at: string;
}

export interface OfficeState {
  agent_id: string;
  x: number;
  y: number;
  room: string;
  activity: string;
  updated_at: string;
}

export interface OfficeEvent {
  id: string;
  agent_id: string;
  event_type: string;
  data: Record<string, unknown>;
  created_at: string;
}

// ── API DTOs ──
export interface CreateProposalInput {
  agent_id: string;
  title: string;
  description: string;
  source?: ProposalSource;
  metadata?: Record<string, unknown>;
  steps?: Array<{ kind: string; config: Record<string, unknown> }>;
}

export interface UpdateProposalInput {
  status: ProposalStatus;
  reason?: string;
  changed_by?: string;
}
