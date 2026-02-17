import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import type { CapGate } from '../types/index.js';

export async function capGateRoutes(app: FastifyInstance) {
  app.get('/cap-gates', async () => {
    const { data, error } = await supabase
      .from('cap_gates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as CapGate[];
  });

  app.post<{
    Body: {
      step_kind: string;
      gate_type: string;
      limit_value: number;
      window?: 'daily' | 'hourly';
      enabled?: boolean;
    };
  }>('/cap-gates', async (req, reply) => {
    const { data, error } = await supabase
      .from('cap_gates')
      .insert({
        step_kind: req.body.step_kind,
        gate_type: req.body.gate_type,
        limit_value: req.body.limit_value,
        window: req.body.window ?? 'daily',
        enabled: req.body.enabled ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return reply.status(201).send(data);
  });
}
