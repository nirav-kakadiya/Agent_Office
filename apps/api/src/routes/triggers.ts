import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import type { TriggerRule } from '../types/index.js';

export async function triggerRoutes(app: FastifyInstance) {
  app.get('/triggers', async () => {
    const { data, error } = await supabase
      .from('trigger_rules')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as TriggerRule[];
  });

  app.post<{
    Body: {
      name: string;
      condition: Record<string, unknown>;
      action_template: Record<string, unknown>;
      cooldown_sec?: number;
      enabled?: boolean;
    };
  }>('/triggers', async (req, reply) => {
    const { data, error } = await supabase
      .from('trigger_rules')
      .insert({
        name: req.body.name,
        condition: req.body.condition,
        action_template: req.body.action_template,
        cooldown_sec: req.body.cooldown_sec ?? 0,
        enabled: req.body.enabled ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return reply.status(201).send(data);
  });

  app.patch<{
    Params: { id: string };
    Body: Partial<{
      name: string;
      condition: Record<string, unknown>;
      action_template: Record<string, unknown>;
      cooldown_sec: number;
      enabled: boolean;
    }>;
  }>('/triggers/:id', async (req) => {
    const { data, error } = await supabase
      .from('trigger_rules')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  });
}
