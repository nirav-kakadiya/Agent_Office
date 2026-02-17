import { supabase } from '../lib/supabase.js';
import type { Mission, MissionStep } from '../types/index.js';

export async function createMission(proposalId: string, priority = 0, steps: Array<{ kind: string; config: Record<string, unknown> }> = []) {
  const { data: mission, error } = await supabase
    .from('missions')
    .insert({ proposal_id: proposalId, priority })
    .select()
    .single();
  if (error) throw error;

  if (steps.length > 0) {
    const stepRows = steps.map(s => ({
      mission_id: (mission as Mission).id,
      kind: s.kind,
      config: s.config,
    }));
    const { error: stepErr } = await supabase.from('mission_steps').insert(stepRows);
    if (stepErr) throw stepErr;
  }

  return mission as Mission;
}

export async function getMission(id: string) {
  const { data, error } = await supabase.from('missions').select('*, mission_steps(*)').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function listMissions(status?: string) {
  let q = supabase.from('missions').select('*').order('created_at', { ascending: false }).limit(50);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function updateMissionStatus(id: string, status: string) {
  const updates: Record<string, unknown> = { status };
  if (status === 'running') updates.started_at = new Date().toISOString();
  if (status === 'succeeded' || status === 'failed') updates.completed_at = new Date().toISOString();
  const { data, error } = await supabase.from('missions').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
