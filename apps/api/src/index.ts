import Fastify from 'fastify';
import { config } from './lib/config.js';
import { proposalRoutes } from './routes/proposals.js';
import { missionRoutes } from './routes/missions.js';
import { agentRoutes } from './routes/agents.js';
import { policyRoutes } from './routes/policies.js';
import { heartbeatRoutes } from './routes/heartbeat.js';
import { workerRoutes } from './routes/workers.js';
import { triggerRoutes } from './routes/triggers.js';
import { reactionRoutes } from './routes/reactions.js';
import { capGateRoutes } from './routes/cap-gates.js';
import { eventRoutes } from './routes/events.js';
import { startStepWorker } from './workers/step-worker.js';
import { startStaleRecovery } from './workers/stale-recovery.js';

const app = Fastify({ logger: true });

// Register routes
app.register(proposalRoutes, { prefix: '/api' });
app.register(missionRoutes, { prefix: '/api' });
app.register(agentRoutes, { prefix: '/api' });
app.register(policyRoutes, { prefix: '/api' });
app.register(heartbeatRoutes, { prefix: '/api' });
app.register(workerRoutes, { prefix: '/api' });
app.register(triggerRoutes, { prefix: '/api' });
app.register(reactionRoutes, { prefix: '/api' });
app.register(capGateRoutes, { prefix: '/api' });
app.register(eventRoutes, { prefix: '/api' });

// Start worker pool + stale recovery
const worker = startStepWorker();
const staleInterval = startStaleRecovery();

// Graceful shutdown
const shutdown = async () => {
  app.log.info('Shutting down...');
  clearInterval(staleInterval);
  await worker.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen({ port: config.port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Agent Office API running at ${address}`);
});
