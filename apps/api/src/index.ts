import Fastify from 'fastify';
import { config } from './lib/config.js';
import { proposalRoutes } from './routes/proposals.js';
import { missionRoutes } from './routes/missions.js';
import { agentRoutes } from './routes/agents.js';
import { policyRoutes } from './routes/policies.js';
import { heartbeatRoutes } from './routes/heartbeat.js';

const app = Fastify({ logger: true });

// Register routes
app.register(proposalRoutes, { prefix: '/api' });
app.register(missionRoutes, { prefix: '/api' });
app.register(agentRoutes, { prefix: '/api' });
app.register(policyRoutes, { prefix: '/api' });
app.register(heartbeatRoutes, { prefix: '/api' });

app.listen({ port: config.port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Agent Office API running at ${address}`);
});
