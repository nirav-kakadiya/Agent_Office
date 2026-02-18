import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing
const mockFrom = vi.fn();
vi.mock('../lib/supabase.js', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

// Mock policy-service
vi.mock('./policy-service.js', () => ({
  getPolicy: vi.fn().mockResolvedValue(null),
}));

import { evaluateApproval } from './approval-service.js';
import { getPolicy } from './policy-service.js';

function mockChain(result: any) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(result),
        in: vi.fn().mockResolvedValue({ count: 0, error: null }),
      }),
    }),
  };
}

describe('approval-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      }
      if (table === 'missions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      }
      return mockChain({ count: 0, error: null });
    });
  });

  it('auto-approves trigger source', async () => {
    const result = await evaluateApproval({
      agent_id: 'a1',
      title: 'test', description: 'test desc',
      source: 'trigger',
    });
    expect(result.status).toBe('approved');
    expect(result.reason).toContain('auto-approved');
  });

  it('auto-approves reaction source', async () => {
    const result = await evaluateApproval({
      agent_id: 'a1',
      title: 'test', description: 'test desc',
      source: 'reaction',
    });
    expect(result.status).toBe('approved');
  });

  it('returns pending for api source with no limits hit', async () => {
    // Mock proposals count = 0, missions count = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      }
      if (table === 'missions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      }
      return mockChain({ count: 0, error: null });
    });

    const result = await evaluateApproval({
      agent_id: 'a1',
      title: 'test', description: 'test desc',
      source: 'api',
    });
    expect(result.status).toBe('pending');
    expect(result.reason).toBe('awaiting manual review');
  });

  it('returns needs_review when pending proposals exceed limit', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
            }),
          }),
        };
      }
      return mockChain({ count: 0, error: null });
    });

    const result = await evaluateApproval({
      agent_id: 'a1',
      title: 'test', description: 'test desc',
      source: 'api',
    });
    expect(result.status).toBe('needs_review');
  });

  it('returns needs_review when estimated cost exceeds threshold', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      }
      if (table === 'missions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      }
      return mockChain({ count: 0, error: null });
    });

    const result = await evaluateApproval({
      agent_id: 'a1',
      title: 'expensive task', description: 'test desc',
      source: 'api',
      metadata: { estimated_cost_usd: 5.0 },
    });
    expect(result.status).toBe('needs_review');
    expect(result.reason).toContain('exceeds threshold');
  });

  it('uses custom policy rules when available', async () => {
    (getPolicy as any).mockResolvedValueOnce({
      auto_sources: ['api', 'trigger', 'reaction'],
    });

    const result = await evaluateApproval({
      agent_id: 'a1',
      title: 'test', description: 'test desc',
      source: 'api',
    });
    expect(result.status).toBe('approved');
  });
});
