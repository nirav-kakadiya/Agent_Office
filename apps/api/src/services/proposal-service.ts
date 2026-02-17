import { supabase } from '../lib/supabase.js';
import type { CreateProposalInput, Proposal, CapGate } from '../types/index.js';
import { createMission } from './mission-service.js';
import { enqueueStepsForMission } from './enqueue-steps.js';
import { evaluateApproval } from './approval-service.js';
import { emitEvent } from './event-service.js';

// ── Cap Gate Check ──
async function checkCapGates(steps: Array<{ kind: string }>): Promise<{ allowed: boolean; blocked_by?: string }> {
  if (steps.length === 0) return { allowed: true };

  const kinds = [...new Set(steps.map(s => s.kind))];
  const { data: gates, error } = await supabase
    .from('cap_gates')
    .select('*')
    .in('step_kind', kinds)
    .eq('enabled', true);
  if (error) throw error;

  for (const gate of (gates || []) as CapGate[]) {
    const windowStart = gate.window === 'hourly'
      ? new Date(Date.now() - 3600_000).toISOString()
      : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    // Get step IDs matching the kind, then count action_runs
    const { data: stepIds } = await supabase
      .from('mission_steps')
      .select('id')
      .eq('kind', gate.step_kind);

    if (stepIds && stepIds.length > 0) {
      const { count, error: countErr } = await supabase
        .from('action_runs')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', windowStart)
        .in('step_id', stepIds.map((s: { id: string }) => s.id));
      if (countErr) throw countErr;
      if ((count || 0) >= gate.limit_value) {
        return { allowed: false, blocked_by: `${gate.step_kind}:${gate.gate_type} limit ${gate.limit_value}/${gate.window}` };
      }
    }
  }
  return { allowed: true };
}

// ── Main Pipeline ──
export async function submitProposal(input: CreateProposalInput) {
  const steps = input.steps || [];

  // 1. Cap gate check
  const gateResult = await checkCapGates(steps);
  if (!gateResult.allowed) {
    return { ok: false as const, reason: `Blocked by cap gate: ${gateResult.blocked_by}` };
  }

  // 2. Determine status via approval service
  const decision = await evaluateApproval(input);
  const status = decision.status;

  // 3. Insert proposal
  const { data: proposal, error } = await supabase
    .from('proposals')
    .insert({
      agent_id: input.agent_id,
      title: input.title,
      description: input.description,
      source: input.source || 'api',
      metadata: input.metadata || {},
      status,
    })
    .select()
    .single();
  if (error) throw error;

  const p = proposal as Proposal;

  // 4. Record history
  await supabase.from('proposal_history').insert({
    proposal_id: p.id,
    old_status: null,
    new_status: status,
    changed_by: 'system',
    reason: decision.reason,
  });

  // 5. Emit proposal created event
  await emitEvent(p.agent_id, 'proposal.created', ['proposal', status], {
    proposal_id: p.id,
    title: p.title,
    status,
    source: p.source,
  });

  // 6. If approved, create mission + steps + enqueue
  let mission = null;
  if (status === 'approved' && steps.length > 0) {
    mission = await createMission(p.id, 0, steps);
    await enqueueStepsForMission((mission as { id: string }).id);
  }

  return { ok: true as const, proposal: p, mission };
}

export async function getProposal(id: string) {
  const { data, error } = await supabase.from('proposals').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Proposal;
}

export async function listProposals(status?: string) {
  let q = supabase.from('proposals').select('*').order('created_at', { ascending: false }).limit(50);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data as Proposal[];
}

export async function updateProposalStatus(id: string, newStatus: string, changedBy: string, reason?: string) {
  const old = await getProposal(id);
  const { data, error } = await supabase
    .from('proposals')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  await supabase.from('proposal_history').insert({
    proposal_id: id,
    old_status: old.status,
    new_status: newStatus,
    changed_by: changedBy,
    reason: reason || null,
  });

  const updated = data as Proposal;

  // Emit status change event
  const eventType = newStatus === 'approved' ? 'proposal.approved' : newStatus === 'rejected' ? 'proposal.rejected' : 'proposal.updated';
  await emitEvent(updated.agent_id, eventType, ['proposal', newStatus], {
    proposal_id: id,
    old_status: old.status,
    new_status: newStatus,
  });

  // If just approved and has steps in metadata, create mission
  if (newStatus === 'approved' && old.status !== 'approved') {
    const steps = (updated.metadata as { steps?: Array<{ kind: string; config: Record<string, unknown> }> }).steps;
    if (steps && steps.length > 0) {
      const mission = await createMission(id, 0, steps);
      await enqueueStepsForMission((mission as { id: string }).id);
    }
  }

  return updated;
}
