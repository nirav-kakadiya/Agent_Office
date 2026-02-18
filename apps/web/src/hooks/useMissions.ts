'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Mission, MissionStep } from '@agent-office/shared';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

export interface MissionWithSteps extends Mission {
  steps?: MissionStep[];
}

export function useMissions() {
  const [missions, setMissions] = useState<MissionWithSteps[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('missions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => {
        fetchAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_steps' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  return { missions, loading };
}
