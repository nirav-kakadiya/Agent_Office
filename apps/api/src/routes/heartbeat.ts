import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';

export async function heartbeatRoutes(app: FastifyInstance) {
  // Placeholder for trigger evaluation loop
  app.post('/heartbeat', async () => {
    const { data: rules, error } = await supabase
      .from('trigger_rules')
      .select('*')
      .eq('enabled', true);
    if (error) throw error;

    // TODO: evaluate each rule's condition against recent events
    // and fire matching triggers as proposals

    return {
      evaluated: (rules || []).length,
      fired: 0,
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
}
