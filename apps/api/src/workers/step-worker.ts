import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis.js';
import { supabase } from '../lib/supabase.js';
import { config } from '../lib/config.js';
import { stepQueue } from '../lib/queue.js';
import { getExecutor } from '../executors/registry.js';
import { recordUsage } from '../services/cost-tracker.js';
import { emitEvent } from '../services/event-service.js';
import type { MissionStep } from '../types/index.js';

interface StepJobData {
  stepId: string;
  missionId: string;
  kind: string;
}

async function getAgentIdForMission(missionId: string): Promise<string | null> {
  const { data: mission } = await supabase
    .from('missions').select('proposal_id').eq('id', missionId).single();
  if (!mission) return null;
  const { data: proposal } = await supabase
    .from('proposals').select('agent_id').eq('id', (mission as { proposal_id: string }).proposal_id).single();
  return proposal ? (proposal as { agent_id: string }).agent_id : null;
}

async function processStep(job: Job<StepJobData>): Promise<void> {
  const { stepId, missionId, kind } = job.data;
  const log = (msg: string) => console.log(`[worker:${job.id}] ${msg}`);

  log(`Processing step ${stepId} (${kind}) for mission ${missionId}`);

  // Mark step running
  const { data: step, error: fetchErr } = await supabase
    .from('mission_steps')
    .update({ status: 'running', reserved_at: new Date().toISOString() })
    .eq('id', stepId)
    .select()
    .single();
  if (fetchErr) throw fetchErr;

  // Ensure mission is marked running
  await supabase
    .from('missions')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', missionId)
    .eq('status', 'pending');

  // Create action_run
  const { data: actionRun, error: arErr } = await supabase
    .from('action_runs')
    .insert({ step_id: stepId, started_at: new Date().toISOString() })
    .select()
    .single();
  if (arErr) throw arErr;

  const executor = getExecutor(kind);
  const agentId = await getAgentIdForMission(missionId);

  try {
    const result = await executor.execute(step as MissionStep);
    const now = new Date().toISOString();

    // Update action_run
    await supabase.from('action_runs').update({
      finished_at: now,
      result: result.output as Record<string, unknown>,
      tokens_used: result.tokensUsed || 0,
    }).eq('id', (actionRun as { id: string }).id);

    if (result.success) {
      await supabase.from('mission_steps').update({
        status: 'succeeded',
        result: result.output as Record<string, unknown>,
        completed_at: now,
      }).eq('id', stepId);
      log(`Step ${stepId} succeeded`);

      // Emit step.completed event
      if (agentId) {
        await emitEvent(agentId, 'step.completed', ['step', 'succeeded', kind], {
          step_id: stepId,
          mission_id: missionId,
          kind,
        });
      }
    } else {
      throw new Error('Executor returned success=false');
    }

    // Record cost
    if ((result.tokensUsed || result.costUsd) && agentId) {
      await recordUsage(agentId, result.tokensUsed || 0, 0, result.costUsd || 0);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const now = new Date().toISOString();
    log(`Step ${stepId} failed: ${errorMsg}`);

    await supabase.from('action_runs').update({
      finished_at: now,
      error: errorMsg,
    }).eq('id', (actionRun as { id: string }).id);

    const currentStep = step as MissionStep;
    const retryCount = (currentStep.retry_count || 0) + 1;
    const maxRetries = currentStep.max_retries || 3;

    if (retryCount < maxRetries) {
      const delay = Math.min(
        config.retryBaseDelayMs * Math.pow(2, retryCount),
        config.retryMaxDelayMs,
      ) + Math.random() * 1000;

      await supabase.from('mission_steps').update({
        status: 'queued',
        retry_count: retryCount,
        last_error: errorMsg,
        reserved_at: null,
      }).eq('id', stepId);

      await stepQueue.add('execute-step', job.data, { delay: Math.round(delay) });
      log(`Step ${stepId} re-enqueued (retry ${retryCount}/${maxRetries}, delay ${Math.round(delay)}ms)`);
    } else {
      await supabase.from('mission_steps').update({
        status: 'failed',
        retry_count: retryCount,
        last_error: errorMsg,
        completed_at: now,
      }).eq('id', stepId);
      log(`Step ${stepId} permanently failed after ${retryCount} retries`);

      // Emit step.failed event
      if (agentId) {
        await emitEvent(agentId, 'step.failed', ['step', 'failed', kind], {
          step_id: stepId,
          mission_id: missionId,
          kind,
          error: errorMsg,
        });
      }
    }
  }

  await finalizeMissionIfDone(missionId);
}

async function finalizeMissionIfDone(missionId: string): Promise<void> {
  const { data: steps, error } = await supabase
    .from('mission_steps')
    .select('status')
    .eq('mission_id', missionId);
  if (error || !steps) return;

  const statuses = (steps as Array<{ status: string }>).map(s => s.status);
  const allDone = statuses.every(s => s === 'succeeded' || s === 'failed');
  if (!allDone) return;

  const anyFailed = statuses.some(s => s === 'failed');
  const finalStatus = anyFailed ? 'failed' : 'succeeded';
  const now = new Date().toISOString();

  await supabase.from('missions').update({
    status: finalStatus,
    completed_at: now,
  }).eq('id', missionId);

  // Emit mission event via event-service (triggers + reactions will be evaluated)
  const agentId = await getAgentIdForMission(missionId);
  if (agentId) {
    await emitEvent(agentId, `mission.${finalStatus}`, ['mission', finalStatus], {
      mission_id: missionId,
      status: finalStatus,
    });
  }

  console.log(`[worker] Mission ${missionId} finalized as ${finalStatus}`);
}

export function startStepWorker(): Worker<StepJobData> {
  const worker = new Worker<StepJobData>('mission-steps', processStep, {
    connection: redis,
    concurrency: config.workerConcurrency,
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[worker] Job ${job.id} completed`);
  });

  console.log(`[worker] Step worker started (concurrency: ${config.workerConcurrency})`);
  return worker;
}
