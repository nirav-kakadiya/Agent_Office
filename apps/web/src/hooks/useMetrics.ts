'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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

// Simple SWR-like cache for metrics
const swrCache = new Map<string, { data: unknown; fetchedAt: number }>();

function useSWR<T>(key: string, fetcher: () => Promise<T>, staleMs: number, refreshMs: number) {
  const [data, setData] = useState<T | null>(() => {
    const entry = svrCacheGet<T>(key);
    return entry;
  });
  const [loading, setLoading] = useState(data === null);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async () => {
    try {
      const result = await fetcher();
      swrCache.set(key, { data: result, fetchedAt: Date.now() });
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (e) {
      console.error(`Failed to fetch ${key}:`, e);
      if (mountedRef.current) setLoading(false);
    }
  }, [key, fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    // Show stale data immediately, refresh in background
    const cached = svrCacheGet<T>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
    doFetch();
    const interval = setInterval(doFetch, refreshMs);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [key, doFetch, refreshMs]);

  return { data, loading, refresh: doFetch };
}

function svrCacheGet<T>(key: string): T | null {
  const entry = swrCache.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function useMetricsOverview() {
  const fetcher = useCallback(() => apiFetch<MetricsOverview>('/metrics/overview'), []);
  return useSWR('metrics:overview', fetcher, 30_000, 60_000);
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
  const key = `metrics:costs:${from || ''}:${to || ''}`;
  const fetcher = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return apiFetch<CostData>(`/metrics/costs${qs ? '?' + qs : ''}`);
  }, [from, to]);
  return useSWR(key, fetcher, 60_000, 120_000);
}

export function useTimelineData(days = 30) {
  const key = `metrics:timeline:${days}`;
  const fetcher = useCallback(() => apiFetch<TimelineData>(`/metrics/timeline?days=${days}`), [days]);
  return useSWR(key, fetcher, 60_000, 120_000);
}
