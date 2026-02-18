'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Agent, AgentAffect, OfficeState } from '@agent-office/shared';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

export interface AgentFull {
  agent: Agent;
  affect: AgentAffect | null;
  office: OfficeState | null;
}

type AgentWithJoins = Agent & { agent_affect: AgentAffect[]; office_state: OfficeState[] };

export function useAgents() {
  const [agents, setAgents] = useState<Record<string, AgentFull>>({});
  const [loading, setLoading] = useState(true);
  const pendingUpdates = useRef<Record<string, Partial<AgentFull>>>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const list = await apiFetch<AgentWithJoins[]>('/agents');
      const map: Record<string, AgentFull> = {};
      for (const a of list) {
        map[a.id] = {
          agent: a,
          affect: a.agent_affect?.[0] ?? null,
          office: a.office_state?.[0] ?? null,
        };
      }
      setAgents(map);
    } catch (e) {
      console.error('Failed to fetch agents:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced batch apply of realtime updates
  const flushUpdates = useCallback(() => {
    const updates = pendingUpdates.current;
    if (Object.keys(updates).length === 0) return;
    pendingUpdates.current = {};
    setAgents((prev) => {
      const next = { ...prev };
      for (const [id, partial] of Object.entries(updates)) {
        next[id] = { ...next[id], ...partial };
      }
      return next;
    });
  }, []);

  const queueUpdate = useCallback((id: string, partial: Partial<AgentFull>) => {
    pendingUpdates.current[id] = { ...pendingUpdates.current[id], ...partial };
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(flushUpdates, 500);
  }, [flushUpdates]);

  useEffect(() => {
    fetchAll();

    // Only subscribe when tab is visible
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = () => {
      if (channel) return;
      channel = supabase
        .channel('agents-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, (payload) => {
          const row = payload.new as Agent;
          queueUpdate(row.id, { agent: row });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_affect' }, (payload) => {
          const row = payload.new as AgentAffect;
          queueUpdate(row.agent_id, { affect: row });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'office_state' }, (payload) => {
          const row = payload.new as OfficeState;
          queueUpdate(row.agent_id, { office: row });
        })
        .subscribe();
    };

    const unsubscribe = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        subscribe();
        fetchAll(); // refresh stale data
      } else {
        unsubscribe();
      }
    };

    if (document.visibilityState === 'visible') subscribe();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [fetchAll, queueUpdate]);

  return { agents, loading };
}
