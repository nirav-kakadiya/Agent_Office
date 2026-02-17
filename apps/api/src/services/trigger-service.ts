import { supabase } from '../lib/supabase.js';
import type { AgentEvent, TriggerRule } from '../types/index.js';

/**
 * Check if a trigger condition matches an event.
 * Supported condition keys:
 *   event_type  — exact match on event_type
 *   agent_id    — exact match on agent_id
 *   tags_include — all listed tags must be present
 */
function conditionMatches(condition: Record<string, unknown>, event: AgentEvent): boolean {
  if (condition.event_type && condition.event_type !== event.event_type) return false;
  if (condition.agent_id && condition.agent_id !== event.agent_id) return false;
  if (condition.tags_include) {
    const required = condition.tags_include as string[];
    if (!required.every(t => event.tags.includes(t))) return false;
  }
  return true;
}

function isCoolingDown(rule: TriggerRule): boolean {
  if (!rule.last_fired_at || rule.cooldown_sec <= 0) return false;
  const elapsed = Date.now() - new Date(rule.last_fired_at).getTime();
  return elapsed < rule.cooldown_sec * 1000;
}

export async function evaluateTriggers(event: AgentEvent): Promise<void> {
  const { data: rules, error } = await supabase
    .from('trigger_rules')
    .select('*')
    .eq('enabled', true);
  if (error) throw error;
  if (!rules || rules.length === 0) return;

  // Import lazily to avoid circular deps
  const { submitProposal } = await import('./proposal-service.js');

  for (const rule of rules as TriggerRule[]) {
    if (!conditionMatches(rule.condition, event)) continue;
    if (isCoolingDown(rule)) continue;

    const template = rule.action_template as {
      agent_id?: string;
      title?: string;
      description?: string;
      steps?: Array<{ kind: string; config: Record<string, unknown> }>;
    };

    try {
      await submitProposal({
        agent_id: template.agent_id || event.agent_id,
        title: template.title || `Triggered: ${rule.name}`,
        description: template.description || `Auto-triggered by rule "${rule.name}" from event ${event.event_type}`,
        source: 'trigger',
        metadata: { trigger_rule_id: rule.id, source_event_id: event.id },
        steps: template.steps || [],
      });

      // Update last_fired_at
      await supabase
        .from('trigger_rules')
        .update({ last_fired_at: new Date().toISOString() })
        .eq('id', rule.id);

      // Log the trigger fire as an event
      await supabase.from('agent_events').insert({
        agent_id: template.agent_id || event.agent_id,
        event_type: 'trigger.fired',
        tags: ['trigger', rule.name],
        payload: { trigger_rule_id: rule.id, source_event_id: event.id },
      });

      console.log(`[trigger-service] Rule "${rule.name}" fired for event ${event.event_type}`);
    } catch (err) {
      console.error(`[trigger-service] Error firing rule "${rule.name}":`, err);
    }
  }
}
