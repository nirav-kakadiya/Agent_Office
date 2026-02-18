import type { FastifyInstance } from 'fastify';
import { getMission, listMissions, updateMissionStatus } from '../services/mission-service.js';
import { enqueueStepsForMission } from '../services/enqueue-steps.js';
import { getCached, setCache, invalidateCache } from '../lib/cache.js';

export async function missionRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { status?: string } }>('/missions', async (req, reply) => {
    const cacheKey = `missions:list:${req.query.status || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) return reply.header('Cache-Control', 'public, max-age=5').send(cached);

    const result = await listMissions(req.query.status);
    return reply.header('Cache-Control', 'public, max-age=5').send(setCache(cacheKey, result, 10_000));
  });

  app.get<{ Params: { id: string } }>('/missions/:id', async (req, reply) => {
    const result = await getMission(req.params.id);
    return reply.header('Cache-Control', 'public, max-age=5').send(result);
  });

  app.patch<{ Params: { id: string }; Body: { status: string } }>('/missions/:id', async (req) => {
    const result = await updateMissionStatus(req.params.id, req.body.status);
    invalidateCache('missions:');
    invalidateCache('metrics:');
    return result;
  });

  app.post<{ Params: { id: string } }>('/missions/:id/run', async (req, reply) => {
    const mission = await getMission(req.params.id);
    if (!mission) {
      return reply.code(404).send({ error: 'Mission not found' });
    }
    const enqueued = await enqueueStepsForMission(req.params.id);
    invalidateCache('missions:');
    return { ok: true, enqueued };
  });
}
