import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import type { Agent } from '../types/index.js';

export async function agentRoutes(app: FastifyInstance) {
  app.get('/agents', async () => {
    const { data, error } = await supabase.from('agents').select('*');
    if (error) throw error;
    return data as Agent[];
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
    return data;
  });
}
