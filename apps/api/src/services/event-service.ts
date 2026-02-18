import { supabase } from '../lib/supabase.js';
import { evaluateTriggers } from './trigger-service.js';
import { evaluateReactions } from './reaction-service.js';
import type { AgentEvent } from '../types/index.js';

export async function emitEvent(
  agentId: string,
  eventType: string,
  tags: string[],
  payload: Record<string, unknown> = {},
): Promise<AgentEvent> {
  const { data, error } = await supabase
    .from('agent_events')
    .insert({ agent_id: agentId, event_type: eventType, tags, payload })
    .select()
    .single();
  if (error) throw error;

  const event = data as AgentEvent;

  // Evaluate triggers and reactions asynchronously (don't block the caller)
  setImmediate(async () => {
    try {
      await evaluateTriggers(event);
    } catch (err) {
      console.error('[event-service] Trigger evaluation error:', err);
    }
    try {
      await evaluateReactions(event);
    } catch (err) {
      console.error('[event-service] Reaction evaluation error:', err);
    }
  });

  return event;
}

export async function listEvents(opts: { agentId?: string; eventType?: string; limit?: number; offset?: number } = {}) {
  const limit = opts.limit || 50;
  const offset = opts.offset || 0;
  let q = supabase
    .from('agent_events')
    .select('id, agent_id, event_type, tags, payload, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.agentId) q = q.eq('agent_id', opts.agentId);
  if (opts.eventType) q = q.eq('event_type', opts.eventType);

  const { data, error } = await q;
  if (error) throw error;
  return data as AgentEvent[];
}
