import { createLogger } from '../lib/logger.js';
import { config } from '../lib/config.js';

const log = createLogger('alert-service');

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType =
  | 'mission_failure_rate'
  | 'agent_budget_exceeded'
  | 'step_retry_exhausted'
  | 'stale_missions_detected';

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ── Dedup / cooldown ──
const lastFired = new Map<string, number>();
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function dedupKey(type: AlertType, meta?: Record<string, unknown>): string {
  const suffix = meta?.agent_id || meta?.mission_id || meta?.step_id || '';
  return `${type}:${suffix}`;
}

function shouldFire(key: string, cooldownMs = DEFAULT_COOLDOWN_MS): boolean {
  const last = lastFired.get(key);
  if (last && Date.now() - last < cooldownMs) return false;
  lastFired.set(key, Date.now());
  return true;
}

// ── Fire alert ──
export async function fireAlert(
  type: AlertType,
  severity: AlertSeverity,
  message: string,
  metadata?: Record<string, unknown>,
  cooldownMs?: number,
): Promise<boolean> {
  const key = dedupKey(type, metadata);
  if (!shouldFire(key, cooldownMs)) {
    log.debug(`Alert deduped: ${key}`);
    return false;
  }

  const alert: Alert = { type, severity, message, metadata, timestamp: new Date().toISOString() };

  // Console channel (always)
  log.warn(`🚨 ALERT [${severity}] ${message}`, metadata);

  // Webhook channel (optional)
  const webhookUrl = config.alertWebhookUrl;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (err) {
      log.error('Failed to send webhook alert', { error: String(err) });
    }
  }

  return true;
}

// ── Convenience helpers ──

export async function alertMissionFailureRate(failedCount: number, totalCount: number, threshold: number) {
  const rate = totalCount > 0 ? failedCount / totalCount : 0;
  if (rate > threshold) {
    await fireAlert(
      'mission_failure_rate',
      'warning',
      `Mission failure rate ${(rate * 100).toFixed(1)}% exceeds threshold ${(threshold * 100).toFixed(1)}%`,
      { failedCount, totalCount, rate },
    );
  }
}

export async function alertBudgetExceeded(agentId: string, totalCost: number, budgetUsd: number) {
  if (totalCost > budgetUsd) {
    await fireAlert(
      'agent_budget_exceeded',
      'critical',
      `Agent ${agentId} cost $${totalCost.toFixed(4)} exceeds budget $${budgetUsd.toFixed(2)}`,
      { agent_id: agentId, totalCost, budgetUsd },
    );
  }
}

export async function alertRetryExhausted(stepId: string, missionId: string, kind: string, retryCount: number) {
  await fireAlert(
    'step_retry_exhausted',
    'warning',
    `Step ${stepId} (${kind}) exhausted ${retryCount} retries in mission ${missionId}`,
    { step_id: stepId, mission_id: missionId, kind, retryCount },
  );
}

export async function alertStaleMissions(count: number) {
  await fireAlert(
    'stale_missions_detected',
    'warning',
    `Detected ${count} stale mission step(s) requiring recovery`,
    { count },
  );
}

// For testing
export function _resetCooldowns() {
  lastFired.clear();
}
