import { supabase } from '../lib/supabase.js';
import { stepQueue } from '../lib/queue.js';
import { config } from '../lib/config.js';

export function startStaleRecovery(): ReturnType<typeof setInterval> {
  const interval = setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - config.staleStepTimeoutMs).toISOString();
      const { data: staleSteps, error } = await supabase
        .from('mission_steps')
        .select('id, mission_id, kind')
        .eq('status', 'running')
        .lt('reserved_at', cutoff);

      if (error) {
        console.error('[stale-recovery] Query error:', error.message);
        return;
      }
      if (!staleSteps || staleSteps.length === 0) return;

      console.log(`[stale-recovery] Found ${staleSteps.length} stale step(s), re-queuing...`);
      for (const step of staleSteps as Array<{ id: string; mission_id: string; kind: string }>) {
        await supabase.from('mission_steps').update({
          status: 'queued',
          reserved_at: null,
        }).eq('id', step.id);

        await stepQueue.add('execute-step', {
          stepId: step.id,
          missionId: step.mission_id,
          kind: step.kind,
        });
      }
    } catch (err) {
      console.error('[stale-recovery] Error:', err);
    }
  }, 60_000);

  console.log('[stale-recovery] Started (interval: 60s)');
  return interval;
}
