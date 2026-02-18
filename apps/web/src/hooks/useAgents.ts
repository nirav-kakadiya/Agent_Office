'use client';

import { useEffect, useState, useCallback } from 'react';
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

  const fetchAll = useCallback(async () => {
    try {
      // Single API call — returns agents with affect + office joined
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

  useEffect(() => {
    fetchAll();

    // Single realtime channel for all agent-related changes
    const channel = supabase
      .channel('agents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, (payload) => {
        const row = payload.new as Agent;
        setAgents((prev) => ({
          ...prev,
          [row.id]: { ...prev[row.id], agent: row },
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_affect' }, (payload) => {
        const row = payload.new as AgentAffect;
        setAgents((prev) => ({
          ...prev,
          [row.agent_id]: { ...prev[row.agent_id], affect: row },
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'office_state' }, (payload) => {
        const row = payload.new as OfficeState;
        setAgents((prev) => ({
          ...prev,
          [row.agent_id]: { ...prev[row.agent_id], office: row },
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  return { agents, loading };
}
