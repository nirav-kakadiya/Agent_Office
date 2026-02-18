import { supabase } from './supabase.js';

const pendingUpdates = new Map<string, { data: Record<string, unknown>; timer: ReturnType<typeof setTimeout> }>();
const DEBOUNCE_MS = 300;

/**
 * Debounce office_state updates for a given agent.
 * Rapid position changes are coalesced into a single write.
 */
export function debouncedOfficeStateUpdate(agentId: string, updates: Record<string, unknown>) {
  const existing = pendingUpdates.get(agentId);
  if (existing) {
    clearTimeout(existing.timer);
    Object.assign(existing.data, updates);
  } else {
    pendingUpdates.set(agentId, { data: { ...updates }, timer: null as unknown as ReturnType<typeof setTimeout> });
  }

  const entry = pendingUpdates.get(agentId)!;
  entry.timer = setTimeout(async () => {
    pendingUpdates.delete(agentId);
    try {
      await supabase
        .from('office_state')
        .upsert({ agent_id: agentId, ...entry.data }, { onConflict: 'agent_id' });
    } catch (err) {
      console.error(`[debounced-state] Error updating office_state for ${agentId}:`, err);
    }
  }, DEBOUNCE_MS);
}

/** Flush all pending updates (call on shutdown). */
export async function flushOfficeStateUpdates() {
  const promises: Promise<void>[] = [];
  for (const [agentId, entry] of pendingUpdates) {
    clearTimeout(entry.timer);
    promises.push(
      (async () => {
        try {
          await supabase
            .from('office_state')
            .upsert({ agent_id: agentId, ...entry.data }, { onConflict: 'agent_id' });
        } catch (err: unknown) {
          console.error(`[debounced-state] Flush error for ${agentId}:`, err);
        }
      })()
    );
  }
  pendingUpdates.clear();
  await Promise.all(promises);
}
