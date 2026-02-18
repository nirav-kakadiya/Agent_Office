'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { AgentEvent } from '@agent-office/shared';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

export function useEvents(limit = 50) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const pendingInserts = useRef<AgentEvent[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const flushInserts = useCallback(() => {
    const batch = pendingInserts.current;
    if (batch.length === 0) return;
    pendingInserts.current = [];
    setEvents((prev) => [...batch.reverse(), ...prev].slice(0, limit));
  }, [limit]);

  useEffect(() => {
    fetchAll();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = () => {
      if (channel) return;
      channel = supabase
        .channel('events-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_events' }, (payload) => {
          const row = payload.new as AgentEvent;
          pendingInserts.current.push(row);
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(flushInserts, 500);
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
        fetchAll();
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
  }, [fetchAll, flushInserts]);

  return { events, loading };
}
