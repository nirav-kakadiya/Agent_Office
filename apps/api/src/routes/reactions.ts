import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { getCached, setCache, invalidateCache } from '../lib/cache.js';
import type { ReactionMatrix } from '../types/index.js';

export async function reactionRoutes(app: FastifyInstance) {
  app.get('/reactions', async (_req, reply) => {
    const cached = getCached('reactions:all');
    if (cached) return reply.header('Cache-Control', 'public, max-age=30').send(cached);

    const { data, error } = await supabase
      .from('reaction_matrix')
      .select('id, source_agent, event_tags, target_agent, reaction_type, probability, cooldown_sec, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return reply.header('Cache-Control', 'public, max-age=30').send(setCache('reactions:all', data as ReactionMatrix[], 60_000));
  });

  app.post<{
    Body: {
      source_agent: string;
      event_tags: string[];
      target_agent: string;
      reaction_type: string;
      probability?: number;
      cooldown_sec?: number;
    };
  }>('/reactions', async (req, reply) => {
    const { data, error } = await supabase
      .from('reaction_matrix')
      .insert({
        source_agent: req.body.source_agent,
        event_tags: req.body.event_tags,
        target_agent: req.body.target_agent,
        reaction_type: req.body.reaction_type,
        probability: req.body.probability ?? 1.0,
        cooldown_sec: req.body.cooldown_sec ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    invalidateCache('reactions:');
    return reply.status(201).send(data);
  });

  app.patch<{
    Params: { id: string };
    Body: Partial<{
      source_agent: string;
      event_tags: string[];
      target_agent: string;
      reaction_type: string;
      probability: number;
      cooldown_sec: number;
    }>;
  }>('/reactions/:id', async (req) => {
    const { data, error } = await supabase
      .from('reaction_matrix')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    invalidateCache('reactions:');
    return data;
  });
}
