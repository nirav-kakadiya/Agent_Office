'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface MetricsOverview {
  missions: { total: number; succeeded: number; failed: number; running: number; pending: number };
  proposals: { total: number; approved: number; rejected: number; pending: number };
  agents: { total: number; working: number; idle: number };
  cost: { totalCost: number; totalTokensIn: number; totalTokensOut: number };
}

export interface AgentMetrics {
  missions: { total: number; succeeded: number; failed: number; successRate: number };
  cost: { totalCost: number; totalTokensIn: number; totalTokensOut: number; daily: Array<{ date: string; cost_usd: number; tokens_in: number; tokens_out: number }> };
  affect: { mood: string; energy: number; last_activity: string | null } | null;
  recentEvents: Array<{ id: string; event_type: string; created_at: string }>;
}

export interface CostData {
  byAgent: Record<string, { cost: number; tokensIn: number; tokensOut: number }>;
  timeline: Array<{ date: string; daily: number; cumulative: number }>;
  total: number;
}

export interface TimelineData {
  missions: Record<string, { succeeded: number; failed: number; total: number }>;
  proposals: Record<string, { approved: number; rejected: number; pending: number; total: number }>;
  eventCount: number;
}

export function useMetricsOverview() {
  const [data, setData] = useState<MetricsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const result = await apiFetch<MetricsOverview>('/metrics/overview');
      setData(result);
    } catch (e) {
      console.error('Failed to fetch metrics overview:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 60000); // 60s refresh (was 15s)
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, loading, refresh: fetch };
}

export function useAgentMetrics(agentId: string | null) {
  const [data, setData] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    apiFetch<AgentMetrics>(`/metrics/agents/${agentId}`)
      .then(setData)
      .catch((e) => console.error('Failed to fetch agent metrics:', e))
      .finally(() => setLoading(false));
  }, [agentId]);

  return { data, loading };
}

export function useCostData(from?: string, to?: string) {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    apiFetch<CostData>(`/metrics/costs${qs ? '?' + qs : ''}`)
      .then(setData)
      .catch((e) => console.error('Failed to fetch cost data:', e))
      .finally(() => setLoading(false));
  }, [from, to]);

  return { data, loading };
}

export function useTimelineData(days = 30) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<TimelineData>(`/metrics/timeline?days=${days}`)
      .then(setData)
      .catch((e) => console.error('Failed to fetch timeline:', e))
      .finally(() => setLoading(false));
  }, [days]);

  return { data, loading };
}
