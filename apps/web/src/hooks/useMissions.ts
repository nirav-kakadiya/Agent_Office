'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Mission, MissionStep } from '@agent-office/shared';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

export interface MissionWithSteps extends Mission {
  steps?: MissionStep[];
}

export function useMissions() {
  const [missions, setMissions] = useState<MissionWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const list = await apiFetch<Mission[]>('/missions');
      setMissions(list);
    } catch (e) {
      console.error('Failed to fetch missions:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced refetch — coalesce rapid realtime changes
  const debouncedFetch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fetchAll, 500);
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = () => {
      if (channel) return;
      channel = supabase
        .channel('missions-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => {
          debouncedFetch();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_steps' }, () => {
          debouncedFetch();
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
  }, [fetchAll, debouncedFetch]);

  return { missions, loading };
}
