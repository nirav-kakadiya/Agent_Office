import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { getPolicy, setPolicy, invalidateCache } from '../services/policy-service.js';

export async function policyRoutes(app: FastifyInstance) {
  app.get('/policies', async () => {
    const { data, error } = await supabase.from('policies').select('*');
    if (error) throw error;
    return data;
  });

  app.get<{ Params: { key: string } }>('/policies/:key', async (req) => {
    const value = await getPolicy(req.params.key);
    if (!value) {
      const { data, error } = await supabase.from('policies').select('*').eq('key', req.params.key).single();
      if (error) throw error;
      return data;
    }
    return { key: req.params.key, value_json: value };
  });

  app.put<{ Params: { key: string }; Body: { value_json: Record<string, unknown>; updated_by?: string } }>(
    '/policies/:key',
    async (req) => {
      const result = await setPolicy(req.params.key, req.body.value_json, req.body.updated_by || 'api');
      return result;
    }
  );

  // Invalidate cache endpoint
  app.post('/policies/cache/invalidate', async () => {
    invalidateCache();
    return { ok: true };
  });
}
