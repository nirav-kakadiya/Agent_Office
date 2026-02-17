import { supabase } from '../lib/supabase.js';

export async function recordUsage(agentId: string, tokensIn: number, tokensOut: number, costUsd: number) {
  const { error } = await supabase.from('agent_usage').insert({
    agent_id: agentId,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
  });
  if (error) throw error;
}

export async function getDailyUsage(agentId: string, date?: string) {
  const d = date || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('agent_usage')
    .select('*')
    .eq('agent_id', agentId)
    .eq('date', d);
  if (error) throw error;
  return data;
}
