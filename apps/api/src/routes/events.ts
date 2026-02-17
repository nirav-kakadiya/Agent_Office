import type { FastifyInstance } from 'fastify';
import { listEvents } from '../services/event-service.js';

export async function eventRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { agent_id?: string; event_type?: string; limit?: string };
  }>('/events', async (req) => {
    return listEvents({
      agentId: req.query.agent_id,
      eventType: req.query.event_type,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
    });
  });
}
