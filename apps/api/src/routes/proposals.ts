import type { FastifyInstance } from 'fastify';
import { submitProposal, getProposal, listProposals, updateProposalStatus } from '../services/proposal-service.js';
import type { CreateProposalInput, UpdateProposalInput } from '../types/index.js';

export async function proposalRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateProposalInput }>('/proposals', async (req, reply) => {
    const result = await submitProposal(req.body);
    if (!result.ok) return reply.status(422).send({ error: result.reason });
    return reply.status(201).send(result);
  });

  app.get<{ Querystring: { status?: string } }>('/proposals', async (req) => {
    return listProposals(req.query.status);
  });

  app.get<{ Params: { id: string } }>('/proposals/:id', async (req) => {
    return getProposal(req.params.id);
  });

  app.patch<{ Params: { id: string }; Body: UpdateProposalInput }>('/proposals/:id', async (req) => {
    return updateProposalStatus(req.params.id, req.body.status, req.body.changed_by || 'api', req.body.reason);
  });
}
