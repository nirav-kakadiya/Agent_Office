import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { getCached, setCache, invalidateCache } from '../lib/cache.js';
import type { TriggerRule } from '../types/index.js';

export async function triggerRoutes(app: FastifyInstance) {
  app.get('/triggers', async (_req, reply) => {
    const cached = getCached('triggers:all');
    if (cached) return reply.header('Cache-Control', 'public, max-age=30').send(cached);

    const { data, error } = await supabase
      .from('trigger_rules')
      .select('id, name, condition, action_template, cooldown_sec, enabled, last_fired_at, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return reply.header('Cache-Control', 'public, max-age=30').send(setCache('triggers:all', data as TriggerRule[], 60_000));
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
    invalidateCache('triggers:');
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
    invalidateCache('triggers:');
    return data;
  });
}
