'use client';

import { useEffect, useState, useCallback } from 'react';
import type { AgentEvent } from '@agent-office/shared';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

export function useEvents(limit = 50) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const list = await apiFetch<AgentEvent[]>('/events?limit=' + limit);
      setEvents(list);
    } catch (e) {
      console.error('Failed to fetch events:', e);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_events' }, (payload) => {
        const row = payload.new as AgentEvent;
        setEvents((prev) => [row, ...prev].slice(0, limit));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll, limit]);

  return { events, loading };
}
