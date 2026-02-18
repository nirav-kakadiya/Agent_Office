import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { getPolicy, setPolicy, invalidateCache as invalidatePolicyCache } from '../services/policy-service.js';
import { getCached, setCache, invalidateCache } from '../lib/cache.js';

export async function policyRoutes(app: FastifyInstance) {
  app.get('/policies', async (_req, reply) => {
    const cached = getCached('policies:all');
    if (cached) return reply.header('Cache-Control', 'public, max-age=30').send(cached);

    const { data, error } = await supabase.from('policies').select('key, value_json, updated_by, updated_at');
    if (error) throw error;
    return reply.header('Cache-Control', 'public, max-age=30').send(setCache('policies:all', data, 60_000));
  });

  app.get<{ Params: { key: string } }>('/policies/:key', async (req, reply) => {
    const value = await getPolicy(req.params.key);
    if (!value) {
      const { data, error } = await supabase.from('policies').select('key, value_json, updated_by, updated_at').eq('key', req.params.key).single();
      if (error) throw error;
      return reply.header('Cache-Control', 'public, max-age=30').send(data);
    }
    return reply.header('Cache-Control', 'public, max-age=30').send({ key: req.params.key, value_json: value });
  });

  app.put<{ Params: { key: string }; Body: { value_json: Record<string, unknown>; updated_by?: string } }>(
    '/policies/:key',
    async (req) => {
      const result = await setPolicy(req.params.key, req.body.value_json, req.body.updated_by || 'api');
      invalidateCache('policies:');
      return result;
    }
  );

  app.post('/policies/cache/invalidate', async () => {
    invalidatePolicyCache();
    invalidateCache('policies:');
    return { ok: true };
  });
}
