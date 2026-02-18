import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { redis } from '../lib/redis.js';
import { stepQueue } from '../lib/queue.js';

export async function healthRoutes(app: FastifyInstance) {
  // Deep health check
  app.get('/health', async (_req, reply) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // DB check
    const dbStart = Date.now();
    try {
      const { error } = await supabase.from('agents').select('id').limit(1);
      checks.database = error
        ? { status: 'unhealthy', error: error.message, latencyMs: Date.now() - dbStart }
        : { status: 'healthy', latencyMs: Date.now() - dbStart };
    } catch (e) {
      checks.database = { status: 'unhealthy', error: String(e), latencyMs: Date.now() - dbStart };
    }

    // Redis check
    const redisStart = Date.now();
    try {
      await redis.ping();
      checks.redis = { status: 'healthy', latencyMs: Date.now() - redisStart };
    } catch (e) {
      checks.redis = { status: 'unhealthy', error: String(e), latencyMs: Date.now() - redisStart };
    }

    // Queue check
    try {
      const [waiting, active] = await Promise.all([
        stepQueue.getWaitingCount(),
        stepQueue.getActiveCount(),
      ]);
      checks.queue = { status: 'healthy', latencyMs: 0 };
      (checks.queue as any).waiting = waiting;
      (checks.queue as any).active = active;
    } catch (e) {
      checks.queue = { status: 'unhealthy', error: String(e) };
    }

    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    });
  });

  // Readiness probe (lightweight)
  app.get('/health/ready', async (_req, reply) => {
    try {
      await redis.ping();
      return reply.send({ status: 'ready', timestamp: new Date().toISOString() });
    } catch {
      return reply.status(503).send({ status: 'not_ready' });
    }
  });
}
