import { supabase } from '../lib/supabase.js';
import type { AgentEvent, ReactionMatrix } from '../types/index.js';

function tagsMatch(reactionTags: string[], eventTags: string[]): boolean {
  if (reactionTags.length === 0) return true; // no filter = match all
  return reactionTags.some(t => eventTags.includes(t));
}

function isCoolingDown(reaction: ReactionMatrix & { last_fired_at?: string | null }): boolean {
  if (!reaction.last_fired_at || reaction.cooldown_sec <= 0) return false;
  const elapsed = Date.now() - new Date(reaction.last_fired_at).getTime();
  return elapsed < reaction.cooldown_sec * 1000;
}

export async function evaluateReactions(event: AgentEvent): Promise<void> {
  const { data: reactions, error } = await supabase
    .from('reaction_matrix')
    .select('*')
    .eq('source_agent', event.agent_id);
  if (error) throw error;
  if (!reactions || reactions.length === 0) return;

  const { submitProposal } = await import('./proposal-service.js');

  for (const reaction of reactions as (ReactionMatrix & { last_fired_at?: string | null })[]) {
    if (!tagsMatch(reaction.event_tags, event.tags)) continue;
    if (isCoolingDown(reaction)) continue;

    // Probability roll
    if (Math.random() > reaction.probability) continue;

    try {
      await submitProposal({
        agent_id: reaction.target_agent,
        title: `Reaction: ${reaction.reaction_type}`,
        description: `Auto-reaction by ${reaction.target_agent} to ${event.event_type} from ${event.agent_id}`,
        source: 'reaction',
        metadata: {
          reaction_id: reaction.id,
          source_event_id: event.id,
          source_agent: event.agent_id,
        },
        steps: [],
      });

      // Update last_fired_at for cooldown
      await supabase
        .from('reaction_matrix')
        .update({ last_fired_at: new Date().toISOString() })
        .eq('id', reaction.id);

      // Log reaction fire as event
      await supabase.from('agent_events').insert({
        agent_id: reaction.target_agent,
        event_type: 'reaction.fired',
        tags: ['reaction', reaction.reaction_type],
        payload: {
          reaction_id: reaction.id,
          source_event_id: event.id,
          source_agent: event.agent_id,
        },
      });

      console.log(`[reaction-service] ${reaction.target_agent} reacted (${reaction.reaction_type}) to ${event.event_type}`);
    } catch (err) {
      console.error(`[reaction-service] Error processing reaction ${reaction.id}:`, err);
    }
  }
}
