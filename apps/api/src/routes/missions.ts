import type { FastifyInstance } from 'fastify';
import { getMission, listMissions, updateMissionStatus } from '../services/mission-service.js';
import { enqueueStepsForMission } from '../services/enqueue-steps.js';

export async function missionRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { status?: string } }>('/missions', async (req) => {
    return listMissions(req.query.status);
  });

  app.get<{ Params: { id: string } }>('/missions/:id', async (req) => {
    return getMission(req.params.id);
  });

  app.patch<{ Params: { id: string }; Body: { status: string } }>('/missions/:id', async (req) => {
    return updateMissionStatus(req.params.id, req.body.status);
  });

  app.post<{ Params: { id: string } }>('/missions/:id/run', async (req, reply) => {
    const mission = await getMission(req.params.id);
    if (!mission) {
      return reply.code(404).send({ error: 'Mission not found' });
    }
    const enqueued = await enqueueStepsForMission(req.params.id);
    return { ok: true, enqueued };
  });
}
