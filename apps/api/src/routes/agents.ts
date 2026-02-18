import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { getCached, setCache, invalidateCache } from '../lib/cache.js';
import type { Agent } from '../types/index.js';

const AGENTS_CACHE_TTL = 10_000; // 10s cache for agent list

export async function agentRoutes(app: FastifyInstance) {
  // Returns all agents with their affect + office state in ONE query (no N+1)
  app.get('/agents', async () => {
    const cached = getCached('agents:all');
    if (cached) return cached;

    const { data, error } = await supabase
      .from('agents')
      .select('*, agent_affect(*), office_state(*)');
    if (error) throw error;
    return setCache('agents:all', data, AGENTS_CACHE_TTL);
  });

  app.get<{ Params: { id: string } }>('/agents/:id', async (req) => {
    const { data, error } = await supabase
      .from('agents')
      .select('*, agent_affect(*), office_state(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    return data;
  });

  app.patch<{ Params: { id: string }; Body: Partial<Agent> }>('/agents/:id', async (req) => {
    const { data, error } = await supabase
      .from('agents')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    invalidateCache('agents:');
    return data;
  });
}
