import { supabase } from '../lib/supabase.js';
import { stepQueue } from '../lib/queue.js';
import type { MissionStep } from '../types/index.js';

export async function enqueueStepsForMission(missionId: string): Promise<number> {
  const { data: steps, error } = await supabase
    .from('mission_steps')
    .select('*')
    .eq('mission_id', missionId)
    .eq('status', 'queued');
  if (error) throw error;
  if (!steps || steps.length === 0) return 0;

  for (const step of steps as MissionStep[]) {
    await stepQueue.add('execute-step', {
      stepId: step.id,
      missionId,
      kind: step.kind,
    });
  }

  return steps.length;
}
