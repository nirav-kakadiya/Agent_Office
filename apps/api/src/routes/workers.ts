import type { FastifyInstance } from 'fastify';
import { stepQueue } from '../lib/queue.js';

export async function workerRoutes(app: FastifyInstance) {
  app.get('/workers/status', async () => {
    const [waiting, active, completed, failed] = await Promise.all([
      stepQueue.getWaitingCount(),
      stepQueue.getActiveCount(),
      stepQueue.getCompletedCount(),
      stepQueue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  });
}
