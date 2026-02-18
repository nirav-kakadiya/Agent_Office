import type { FastifyInstance } from 'fastify';
import { listEvents } from '../services/event-service.js';
import { getCached, setCache } from '../lib/cache.js';

export async function eventRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { agent_id?: string; event_type?: string; limit?: string; offset?: string };
  }>('/events', async (req, reply) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const cacheKey = `events:${req.query.agent_id || ''}:${req.query.event_type || ''}:${limit}:${offset}`;

    const cached = getCached(cacheKey);
    if (cached) return reply.header('Cache-Control', 'public, max-age=3').send(cached);

    const result = await listEvents({
      agentId: req.query.agent_id,
      eventType: req.query.event_type,
      limit,
      offset,
    });
    return reply.header('Cache-Control', 'public, max-age=3').send(setCache(cacheKey, result, 5_000));
  });
}
