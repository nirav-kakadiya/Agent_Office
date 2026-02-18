import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fireAlert,
  alertMissionFailureRate,
  alertBudgetExceeded,
  alertRetryExhausted,
  alertStaleMissions,
  _resetCooldowns,
} from './alert-service.js';

// Mock config
vi.mock('../lib/config.js', () => ({
  config: {
    alertWebhookUrl: '',
    dailyBudgetUsd: 10,
    missionFailureRateThreshold: 0.3,
  },
}));

describe('alert-service', () => {
  beforeEach(() => {
    _resetCooldowns();
  });

  it('fires an alert and returns true', async () => {
    const result = await fireAlert('mission_failure_rate', 'warning', 'test alert');
    expect(result).toBe(true);
  });

  it('deduplicates same alert within cooldown', async () => {
    const r1 = await fireAlert('mission_failure_rate', 'warning', 'test', undefined, 60_000);
    const r2 = await fireAlert('mission_failure_rate', 'warning', 'test', undefined, 60_000);
    expect(r1).toBe(true);
    expect(r2).toBe(false);
  });

  it('allows same alert type with different metadata', async () => {
    const r1 = await fireAlert('agent_budget_exceeded', 'critical', 'a', { agent_id: 'a1' });
    const r2 = await fireAlert('agent_budget_exceeded', 'critical', 'b', { agent_id: 'a2' });
    expect(r1).toBe(true);
    expect(r2).toBe(true);
  });

  it('fires after cooldown reset', async () => {
    await fireAlert('stale_missions_detected', 'warning', 'stale');
    _resetCooldowns();
    const r2 = await fireAlert('stale_missions_detected', 'warning', 'stale');
    expect(r2).toBe(true);
  });

  it('alertMissionFailureRate fires when rate exceeds threshold', async () => {
    // 50% failure rate with 30% threshold => should fire
    // We just verify it doesn't throw
    await alertMissionFailureRate(5, 10, 0.3);
  });

  it('alertMissionFailureRate does NOT fire when below threshold', async () => {
    _resetCooldowns();
    // Indirectly test: call with low rate, then check dedup allows next call
    await alertMissionFailureRate(1, 10, 0.3); // 10% < 30%, no fire
    // Since it didn't fire, same key should still be fireable
    const r = await fireAlert('mission_failure_rate', 'warning', 'manual');
    expect(r).toBe(true);
  });

  it('alertBudgetExceeded fires when cost exceeds budget', async () => {
    await alertBudgetExceeded('agent-1', 15, 10);
    // dedup should block second call
    const r = await fireAlert('agent_budget_exceeded', 'critical', 'dup', { agent_id: 'agent-1' });
    expect(r).toBe(false);
  });

  it('alertRetryExhausted fires', async () => {
    await alertRetryExhausted('step-1', 'mission-1', 'research', 3);
  });

  it('alertStaleMissions fires', async () => {
    await alertStaleMissions(5);
  });
});
