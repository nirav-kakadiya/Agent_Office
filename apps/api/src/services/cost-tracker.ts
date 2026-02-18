import { supabase } from '../lib/supabase.js';
import { config } from '../lib/config.js';
import { alertBudgetExceeded } from './alert-service.js';

export async function recordUsage(agentId: string, tokensIn: number, tokensOut: number, costUsd: number) {
  const { error } = await supabase.from('agent_usage').insert({
    agent_id: agentId,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
  });
  if (error) throw error;

  // Check budget alert
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayUsage } = await supabase
    .from('agent_usage')
    .select('cost_usd')
    .eq('agent_id', agentId)
    .eq('date', today);
  if (todayUsage) {
    const totalCost = todayUsage.reduce((s, r) => s + (r.cost_usd || 0), 0);
    await alertBudgetExceeded(agentId, totalCost, config.dailyBudgetUsd);
  }
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
