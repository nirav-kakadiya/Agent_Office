import { supabase } from '../lib/supabase.js';
import type { Policy } from '../types/index.js';

// ── In-memory cache ──
const cache = new Map<string, { value: Record<string, unknown>; fetchedAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function getPolicy(key: string): Promise<Record<string, unknown> | null> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('key', key)
    .single();

  if (error || !data) return null;

  const policy = data as Policy;
  cache.set(key, { value: policy.value_json, fetchedAt: Date.now() });
  return policy.value_json;
}

export async function setPolicy(key: string, value: Record<string, unknown>, changedBy: string): Promise<Policy> {
  const { data: existing } = await supabase
    .from('policies')
    .select('*')
    .eq('key', key)
    .single();

  if (existing) {
    await supabase.from('policy_history').insert({
      policy_id: existing.id,
      old_value: existing.value_json,
      new_value: value,
      changed_by: changedBy,
    });

    const { data, error } = await supabase
      .from('policies')
      .update({ value_json: value, updated_by: changedBy, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();
    if (error) throw error;

    cache.set(key, { value, fetchedAt: Date.now() });
    return data as Policy;
  } else {
    const { data, error } = await supabase
      .from('policies')
      .insert({ key, value_json: value, updated_by: changedBy })
      .select()
      .single();
    if (error) throw error;

    cache.set(key, { value, fetchedAt: Date.now() });
    return data as Policy;
  }
}

export function invalidateCache(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}
