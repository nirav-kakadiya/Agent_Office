import { supabase } from '../lib/supabase.js';
import { getPolicy } from './policy-service.js';
import type { CreateProposalInput, ProposalStatus } from '../types/index.js';

interface AutoApproveRules {
  max_pending_per_agent: number;
  max_cost_usd: number;
  auto_sources: string[];
}

const DEFAULT_RULES: AutoApproveRules = {
  max_pending_per_agent: 3,
  max_cost_usd: 1.0,
  auto_sources: ['trigger', 'reaction'],
};

export interface ApprovalDecision {
  status: ProposalStatus;
  reason: string;
}

export async function evaluateApproval(input: CreateProposalInput): Promise<ApprovalDecision> {
  const policyValue = await getPolicy('auto_approve_rules');
  const rules: AutoApproveRules = policyValue
    ? { ...DEFAULT_RULES, ...(policyValue as Partial<AutoApproveRules>) }
    : DEFAULT_RULES;

  const source = input.source || 'api';

  // Rule 1: Auto-approve if source is in auto_sources
  if (rules.auto_sources.includes(source)) {
    return { status: 'approved', reason: `auto-approved: source=${source}` };
  }

  // Rule 2: Check pending proposal count for this agent
  const { count: pendingCount, error: countErr } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', input.agent_id)
    .eq('status', 'pending');
  if (countErr) throw countErr;

  if ((pendingCount || 0) >= rules.max_pending_per_agent) {
    return {
      status: 'needs_review',
      reason: `Agent ${input.agent_id} has ${pendingCount} pending proposals (limit: ${rules.max_pending_per_agent})`,
    };
  }

  // Rule 3: Check estimated cost
  const estimatedCost = (input.metadata?.estimated_cost_usd as number) || 0;
  if (estimatedCost > rules.max_cost_usd) {
    return {
      status: 'needs_review',
      reason: `Estimated cost $${estimatedCost} exceeds threshold $${rules.max_cost_usd}`,
    };
  }

  // Rule 4: Check active missions for this agent
  const { count: activeMissions, error: mErr } = await supabase
    .from('missions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'running')
    .in('proposal_id', 
      // Sub-select proposals by this agent
      (await supabase.from('proposals').select('id').eq('agent_id', input.agent_id)).data?.map((p: { id: string }) => p.id) || []
    );
  if (mErr) throw mErr;

  if ((activeMissions || 0) >= rules.max_pending_per_agent) {
    return {
      status: 'needs_review',
      reason: `Agent ${input.agent_id} has ${activeMissions} active missions`,
    };
  }

  // Default: pending for API sources
  return { status: 'pending', reason: 'awaiting manual review' };
}
