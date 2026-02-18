import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

vi.mock('../lib/config.js', () => ({
  config: {
    dailyBudgetUsd: 10,
  },
}));

// Mock alert service
const mockAlertBudgetExceeded = vi.fn();
vi.mock('./alert-service.js', () => ({
  alertBudgetExceeded: (...args: any[]) => mockAlertBudgetExceeded(...args),
}));

import { recordUsage, getDailyUsage } from './cost-tracker.js';

describe('cost-tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_usage') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ cost_usd: 2.0 }], error: null }),
            }),
          }),
        };
      }
      return { insert: mockInsert, select: mockSelect };
    });
  });

  it('records usage without throwing', async () => {
    await recordUsage('agent-1', 100, 50, 0.05);
    expect(mockFrom).toHaveBeenCalledWith('agent_usage');
  });

  it('checks budget after recording usage', async () => {
    await recordUsage('agent-1', 100, 50, 0.05);
    // Should have called alertBudgetExceeded with the daily total
    expect(mockAlertBudgetExceeded).toHaveBeenCalledWith('agent-1', 2.0, 10);
  });

  it('triggers budget alert when cost exceeds budget', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_usage') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ cost_usd: 12.0 }], error: null }),
            }),
          }),
        };
      }
      return { insert: mockInsert };
    });

    await recordUsage('agent-1', 1000, 500, 5.0);
    expect(mockAlertBudgetExceeded).toHaveBeenCalledWith('agent-1', 12.0, 10);
  });

  it('getDailyUsage returns data', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ cost_usd: 1.5 }], error: null }),
        }),
      }),
    }));

    const result = await getDailyUsage('agent-1');
    expect(result).toEqual([{ cost_usd: 1.5 }]);
  });

  it('throws on supabase error in getDailyUsage', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
        }),
      }),
    }));

    await expect(getDailyUsage('agent-1')).rejects.toThrow();
  });
});
