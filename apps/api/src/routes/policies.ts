import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';

export async function policyRoutes(app: FastifyInstance) {
  app.get('/policies', async () => {
    const { data, error } = await supabase.from('policies').select('*');
    if (error) throw error;
    return data;
  });

  app.get<{ Params: { key: string } }>('/policies/:key', async (req) => {
    const { data, error } = await supabase.from('policies').select('*').eq('key', req.params.key).single();
    if (error) throw error;
    return data;
  });

  app.put<{ Params: { key: string }; Body: { value_json: Record<string, unknown>; updated_by?: string } }>(
    '/policies/:key',
    async (req) => {
      const { data: existing } = await supabase.from('policies').select('*').eq('key', req.params.key).single();

      if (existing) {
        // Record history
        await supabase.from('policy_history').insert({
          policy_id: existing.id,
          old_value: existing.value_json,
          new_value: req.body.value_json,
          changed_by: req.body.updated_by || 'api',
        });
        const { data, error } = await supabase
          .from('policies')
          .update({ value_json: req.body.value_json, updated_by: req.body.updated_by || 'api', updated_at: new Date().toISOString() })
          .eq('key', req.params.key)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('policies')
          .insert({ key: req.params.key, value_json: req.body.value_json, updated_by: req.body.updated_by || 'api' })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }
  );
}
