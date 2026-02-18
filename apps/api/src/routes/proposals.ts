import type { FastifyInstance } from 'fastify';
import { submitProposal, getProposal, listProposals, updateProposalStatus } from '../services/proposal-service.js';
import type { CreateProposalInput, UpdateProposalInput } from '../types/index.js';
import { getCached, setCache, invalidateCache } from '../lib/cache.js';

export async function proposalRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateProposalInput }>('/proposals', async (req, reply) => {
    const result = await submitProposal(req.body);
    if (!result.ok) return reply.status(422).send({ error: result.reason });
    invalidateCache('proposals:');
    invalidateCache('metrics:');
    invalidateCache('events:');
    return reply.status(201).send(result);
  });

  app.get<{ Querystring: { status?: string } }>('/proposals', async (req, reply) => {
    const cacheKey = `proposals:list:${req.query.status || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) return reply.header('Cache-Control', 'public, max-age=5').send(cached);

    const result = await listProposals(req.query.status);
    return reply.header('Cache-Control', 'public, max-age=5').send(setCache(cacheKey, result, 10_000));
  });

  app.get<{ Params: { id: string } }>('/proposals/:id', async (req, reply) => {
    const result = await getProposal(req.params.id);
    return reply.header('Cache-Control', 'public, max-age=5').send(result);
  });

  app.patch<{ Params: { id: string }; Body: UpdateProposalInput }>('/proposals/:id', async (req) => {
    const result = await updateProposalStatus(req.params.id, req.body.status, req.body.changed_by || 'api', req.body.reason);
    invalidateCache('proposals:');
    invalidateCache('metrics:');
    invalidateCache('events:');
    return result;
  });
}
