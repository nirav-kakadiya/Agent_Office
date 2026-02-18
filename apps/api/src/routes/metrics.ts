import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { getCached, setCache } from '../lib/cache.js';

export async function metricsRoutes(app: FastifyInstance) {
  // System-wide overview — cached 30s
  app.get('/metrics/overview', async (_req, reply) => {
    const cached = getCached('metrics:overview');
    if (cached) return reply.header('Cache-Control', 'public, max-age=15').send(cached);

    const [missions, proposals, agents, usage] = await Promise.all([
      supabase.from('missions').select('id, status'),
      supabase.from('proposals').select('id, status'),
      supabase.from('agents').select('id, status'),
      supabase.from('agent_usage').select('cost_usd, tokens_in, tokens_out'),
    ]);

    const m = missions.data || [];
    const p = proposals.data || [];
    const u = usage.data || [];

    const totalCost = u.reduce((s, r) => s + (r.cost_usd || 0), 0);
    const totalTokensIn = u.reduce((s, r) => s + (r.tokens_in || 0), 0);
    const totalTokensOut = u.reduce((s, r) => s + (r.tokens_out || 0), 0);

    const result = {
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
    };

    return reply.header('Cache-Control', 'public, max-age=15').send(setCache('metrics:overview', result, 30_000));
  });

  // Per-agent metrics — single batch query via join
  app.get<{ Params: { id: string } }>('/metrics/agents/:id', async (req, reply) => {
    const { id } = req.params;
    const cacheKey = `metrics:agent:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return reply.header('Cache-Control', 'public, max-age=10').send(cached);

    // Batch: get proposals + usage + events + affect in parallel
    const [proposalsRes, usage, events, affect] = await Promise.all([
      supabase.from('proposals').select('id').eq('agent_id', id),
      supabase.from('agent_usage').select('date, cost_usd, tokens_in, tokens_out').eq('agent_id', id).order('date', { ascending: false }).limit(30),
      supabase.from('agent_events').select('id, event_type, created_at').eq('agent_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('agent_affect').select('mood, energy, last_activity').eq('agent_id', id).single(),
    ]);

    // Single query for missions via proposal IDs
    const proposalIds = (proposalsRes.data || []).map((p) => p.id);
    const { data: agentMissions } = proposalIds.length > 0
      ? await supabase.from('missions').select('status').in('proposal_id', proposalIds)
      : { data: [] as Array<{ status: string }> };

    const am = agentMissions || [];
    const u = usage.data || [];
    const totalCost = u.reduce((s, r) => s + (r.cost_usd || 0), 0);
    const totalTokensIn = u.reduce((s, r) => s + (r.tokens_in || 0), 0);
    const totalTokensOut = u.reduce((s, r) => s + (r.tokens_out || 0), 0);
    const succeeded = am.filter((x) => x.status === 'succeeded').length;

    const result = {
      missions: {
        total: am.length,
        succeeded,
        failed: am.filter((x) => x.status === 'failed').length,
        successRate: am.length > 0 ? Math.round((succeeded / am.length) * 100) : 0,
      },
      cost: { totalCost, totalTokensIn, totalTokensOut, daily: u },
      affect: affect.data,
      recentEvents: events.data || [],
    };

    return reply.header('Cache-Control', 'public, max-age=10').send(setCache(cacheKey, result, 30_000));
  });

  // Cost breakdown — cached 60s
  app.get<{ Querystring: { from?: string; to?: string } }>('/metrics/costs', async (req, reply) => {
    const { from, to } = req.query;
    const cacheKey = `metrics:costs:${from || ''}:${to || ''}`;
    const cached = getCached(cacheKey);
    if (cached) return reply.header('Cache-Control', 'public, max-age=30').send(cached);

    let query = supabase.from('agent_usage').select('agent_id, date, cost_usd, tokens_in, tokens_out').order('date', { ascending: true });
    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data, error } = await query;
    if (error) return reply.status(500).send({ error: error.message });

    const rows = data || [];
    const byAgent: Record<string, { cost: number; tokensIn: number; tokensOut: number }> = {};
    const byDate: Record<string, number> = {};

    for (const r of rows) {
      if (!byAgent[r.agent_id]) byAgent[r.agent_id] = { cost: 0, tokensIn: 0, tokensOut: 0 };
      byAgent[r.agent_id].cost += r.cost_usd || 0;
      byAgent[r.agent_id].tokensIn += r.tokens_in || 0;
      byAgent[r.agent_id].tokensOut += r.tokens_out || 0;
      byDate[r.date] = (byDate[r.date] || 0) + (r.cost_usd || 0);
    }

    let cumulative = 0;
    const cumulativeData = Object.entries(byDate).sort().map(([date, cost]) => {
      cumulative += cost;
      return { date, daily: cost, cumulative };
    });

    const result = { byAgent, timeline: cumulativeData, total: cumulative };
    return reply.header('Cache-Control', 'public, max-age=30').send(setCache(cacheKey, result, 60_000));
  });

  // Timeline — cached 60s
  app.get<{ Querystring: { days?: string } }>('/metrics/timeline', async (req, reply) => {
    const days = parseInt(req.query.days || '30', 10);
    const cacheKey = `metrics:timeline:${days}`;
    const cached = getCached(cacheKey);
    if (cached) return reply.header('Cache-Control', 'public, max-age=30').send(cached);

    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [missions, proposals, events] = await Promise.all([
      supabase.from('missions').select('id, status, created_at').gte('created_at', since),
      supabase.from('proposals').select('id, status, created_at').gte('created_at', since),
      supabase.from('agent_events').select('id', { count: 'exact', head: true }).gte('created_at', since),
    ]);

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

    const result = {
      missions: mByDay,
      proposals: pByDay,
      eventCount: events.count || 0,
    };

    return reply.header('Cache-Control', 'public, max-age=30').send(setCache(cacheKey, result, 60_000));
  });
}
