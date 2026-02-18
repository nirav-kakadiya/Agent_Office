import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';

export async function metricsRoutes(app: FastifyInstance) {
  // System-wide overview
  app.get('/metrics/overview', async (_req, reply) => {
    const [missions, proposals, agents, usage] = await Promise.all([
      supabase.from('missions').select('id, status, created_at, completed_at'),
      supabase.from('proposals').select('id, status, created_at'),
      supabase.from('agents').select('id, name, status'),
      supabase.from('agent_usage').select('cost_usd, tokens_in, tokens_out'),
    ]);

    const m = missions.data || [];
    const p = proposals.data || [];
    const u = usage.data || [];

    const totalCost = u.reduce((s, r) => s + (r.cost_usd || 0), 0);
    const totalTokensIn = u.reduce((s, r) => s + (r.tokens_in || 0), 0);
    const totalTokensOut = u.reduce((s, r) => s + (r.tokens_out || 0), 0);

    return reply.send({
      missions: {
        total: m.length,
        succeeded: m.filter((x) => x.status === 'succeeded').length,
        failed: m.filter((x) => x.status === 'failed').length,
        running: m.filter((x) => x.status === 'running').length,
        pending: m.filter((x) => x.status === 'pending').length,
      },
      proposals: {
        total: p.length,
        approved: p.filter((x) => x.status === 'approved').length,
        rejected: p.filter((x) => x.status === 'rejected').length,
        pending: p.filter((x) => x.status === 'pending').length,
      },
      agents: {
        total: (agents.data || []).length,
        working: (agents.data || []).filter((x) => x.status === 'working').length,
        idle: (agents.data || []).filter((x) => x.status === 'idle').length,
      },
      cost: { totalCost, totalTokensIn, totalTokensOut },
    });
  });

  // Per-agent metrics
  app.get<{ Params: { id: string } }>('/metrics/agents/:id', async (req, reply) => {
    const { id } = req.params;

    const [missions, usage, events, affect] = await Promise.all([
      supabase.from('missions').select('id, status, proposal_id, created_at, completed_at')
        .eq('proposal_id', supabase.from('proposals').select('id').eq('agent_id', id) as unknown as string),
      supabase.from('agent_usage').select('*').eq('agent_id', id).order('date', { ascending: false }).limit(30),
      supabase.from('agent_events').select('id, event_type, created_at').eq('agent_id', id).order('created_at', { ascending: false }).limit(100),
      supabase.from('agent_affect').select('*').eq('agent_id', id).single(),
    ]);

    // Get missions via proposals for this agent
    const { data: agentProposals } = await supabase.from('proposals').select('id').eq('agent_id', id);
    const proposalIds = (agentProposals || []).map((p) => p.id);
    const { data: agentMissions } = proposalIds.length > 0
      ? await supabase.from('missions').select('*').in('proposal_id', proposalIds)
      : { data: [] as Array<{ status: string; completed_at: string | null; started_at: string | null }> };

    const am = agentMissions || [];
    const u = usage.data || [];
    const totalCost = u.reduce((s, r) => s + (r.cost_usd || 0), 0);
    const totalTokensIn = u.reduce((s, r) => s + (r.tokens_in || 0), 0);
    const totalTokensOut = u.reduce((s, r) => s + (r.tokens_out || 0), 0);
    const succeeded = am.filter((x) => x.status === 'succeeded').length;

    return reply.send({
      missions: {
        total: am.length,
        succeeded,
        failed: am.filter((x) => x.status === 'failed').length,
        successRate: am.length > 0 ? Math.round((succeeded / am.length) * 100) : 0,
      },
      cost: { totalCost, totalTokensIn, totalTokensOut, daily: u },
      affect: affect.data,
      recentEvents: (events.data || []).slice(0, 20),
    });
  });

  // Cost breakdown with date range
  app.get<{ Querystring: { from?: string; to?: string } }>('/metrics/costs', async (req, reply) => {
    const { from, to } = req.query;
    let query = supabase.from('agent_usage').select('agent_id, date, cost_usd, tokens_in, tokens_out').order('date', { ascending: true });

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data, error } = await query;
    if (error) return reply.status(500).send({ error: error.message });

    const rows = data || [];
    // Group by agent
    const byAgent: Record<string, { cost: number; tokensIn: number; tokensOut: number }> = {};
    const byDate: Record<string, number> = {};

    for (const r of rows) {
      if (!byAgent[r.agent_id]) byAgent[r.agent_id] = { cost: 0, tokensIn: 0, tokensOut: 0 };
      byAgent[r.agent_id].cost += r.cost_usd || 0;
      byAgent[r.agent_id].tokensIn += r.tokens_in || 0;
      byAgent[r.agent_id].tokensOut += r.tokens_out || 0;

      byDate[r.date] = (byDate[r.date] || 0) + (r.cost_usd || 0);
    }

    // Cumulative
    let cumulative = 0;
    const cumulativeData = Object.entries(byDate).sort().map(([date, cost]) => {
      cumulative += cost;
      return { date, daily: cost, cumulative };
    });

    return reply.send({ byAgent, timeline: cumulativeData, total: cumulative });
  });

  // Timeline data for charts
  app.get<{ Querystring: { days?: string } }>('/metrics/timeline', async (req, reply) => {
    const days = parseInt(req.query.days || '30', 10);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [missions, proposals, events] = await Promise.all([
      supabase.from('missions').select('id, status, created_at').gte('created_at', since),
      supabase.from('proposals').select('id, status, created_at').gte('created_at', since),
      supabase.from('agent_events').select('id, event_type, created_at').gte('created_at', since),
    ]);

    // Group by day
    const mByDay: Record<string, { succeeded: number; failed: number; total: number }> = {};
    for (const m of missions.data || []) {
      const d = m.created_at.slice(0, 10);
      if (!mByDay[d]) mByDay[d] = { succeeded: 0, failed: 0, total: 0 };
      mByDay[d].total++;
      if (m.status === 'succeeded') mByDay[d].succeeded++;
      if (m.status === 'failed') mByDay[d].failed++;
    }

    const pByDay: Record<string, { approved: number; rejected: number; pending: number; total: number }> = {};
    for (const p of proposals.data || []) {
      const d = p.created_at.slice(0, 10);
      if (!pByDay[d]) pByDay[d] = { approved: 0, rejected: 0, pending: 0, total: 0 };
      pByDay[d].total++;
      if (p.status === 'approved') pByDay[d].approved++;
      if (p.status === 'rejected') pByDay[d].rejected++;
      if (p.status === 'pending') pByDay[d].pending++;
    }

    return reply.send({
      missions: mByDay,
      proposals: pByDay,
      eventCount: (events.data || []).length,
    });
  });
}
