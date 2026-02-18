# Agent Office — Project ARISE

A multi-agent autonomous system with a pixel-art office dashboard. Agents propose, approve, and execute missions through a structured pipeline with cap gates, cost tracking, and observability.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    apps/web (Next.js 14)                │
│         Pixel-art dashboard · PixiJS · Supabase RT      │
└────────────────────────┬────────────────────────────────┘
                         │ REST / Realtime
┌────────────────────────▼────────────────────────────────┐
│                    apps/api (Fastify)                    │
│  Routes · Services · Workers · Executors · Alerts        │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐              │
│  │ Proposals│→ │ Missions │→ │  Steps    │              │
│  └──────────┘  └──────────┘  └─────┬─────┘              │
│       ↑ approval-service           │ step-worker        │
│       │ policy-service             ▼                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐              │
│  │ Triggers │  │Reactions │  │ Executors │              │
│  └──────────┘  └──────────┘  └───────────┘              │
│                                                          │
│  ┌──────────────────┐  ┌────────────────┐                │
│  │  Alert Service   │  │ Cost Tracker   │                │
│  │  (dedup+webhook) │  │ (budget alerts)│                │
│  └──────────────────┘  └────────────────┘                │
└─────────┬──────────────────────┬────────────────────────┘
          │                      │
    ┌─────▼─────┐         ┌──────▼──────┐
    │ Supabase  │         │   Redis     │
    │ (Postgres)│         │  (BullMQ)   │
    └───────────┘         └─────────────┘

packages/shared — Shared TypeScript types
packages/db    — Database migrations (Supabase/Postgres)
```

## Quick Start

### Prerequisites
- Node.js 22+ / Bun 1.x
- Supabase project (or local via `supabase start`)
- Redis 7+

### Setup

```bash
# Install dependencies
bun install

# Copy env
cp .env.example .env

# Run database migrations
cd packages/db && supabase db push

# Start development
bun dev        # starts both api + web via turbo
```

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run the migrations in `packages/db/supabase/migrations/`
3. Copy the project URL and service role key into `.env`

### Redis Setup

```bash
# Local
redis-server

# Or Docker
docker run -d -p 6379:6379 redis:7-alpine
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | API server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `SUPABASE_URL` | Supabase project URL | _(required)_ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | _(required)_ |
| `REDIS_URL` | Redis connection URL | `redis://127.0.0.1:6379` |
| `WORKER_CONCURRENCY` | BullMQ worker concurrency | `3` |
| `STALE_STEP_TIMEOUT_MS` | Stale step detection timeout | `300000` (5min) |
| `RETRY_BASE_DELAY_MS` | Base retry delay | `1000` |
| `RETRY_MAX_DELAY_MS` | Max retry delay | `60000` |
| `ALERT_WEBHOOK_URL` | Webhook URL for alerts (optional) | _(empty)_ |
| `DAILY_BUDGET_USD` | Per-agent daily cost budget | `10` |
| `MISSION_FAILURE_RATE_THRESHOLD` | Alert when failure rate exceeds this | `0.3` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for web app | _(required)_ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for web app | _(required)_ |

## API Reference

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Deep health check (DB, Redis, queue status). Returns 200 or 503 |
| `GET` | `/api/health/ready` | Readiness probe (Redis ping) |

### Proposals

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/proposals` | Submit a new proposal. Body: `CreateProposalInput`. Auto-approval evaluated |
| `GET` | `/api/proposals` | List proposals. Query: `?status=pending` |
| `GET` | `/api/proposals/:id` | Get single proposal |
| `PATCH` | `/api/proposals/:id` | Update proposal status. Body: `{ status, changed_by?, reason? }` |

### Missions

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/missions` | List missions. Query: `?status=running` |
| `GET` | `/api/missions/:id` | Get mission with steps |
| `PATCH` | `/api/missions/:id` | Update mission status. Body: `{ status }` |
| `POST` | `/api/missions/:id/run` | Enqueue mission steps for execution |

### Agents

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/agents` | List all agents |
| `GET` | `/api/agents/:id` | Get agent with affect and office state |
| `PATCH` | `/api/agents/:id` | Update agent. Body: `Partial<Agent>` |

### Policies

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/policies` | List all policies |
| `GET` | `/api/policies/:key` | Get policy by key |
| `PUT` | `/api/policies/:key` | Set/update policy. Body: `{ value_json, updated_by? }` |
| `POST` | `/api/policies/cache/invalidate` | Invalidate policy cache |

### Triggers & Reactions

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/triggers` | List trigger rules |
| `POST` | `/api/triggers` | Create trigger rule |
| `PATCH` | `/api/triggers/:id` | Update trigger rule |
| `GET` | `/api/reactions` | List reaction matrix entries |
| `POST` | `/api/reactions` | Create reaction rule |
| `PATCH` | `/api/reactions/:id` | Update reaction rule |

### Cap Gates

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/cap-gates` | List cap gates |
| `POST` | `/api/cap-gates` | Create cap gate. Body: `{ step_kind, gate_type, limit_value, window?, enabled? }` |

### Events

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/events` | List events. Query: `?agent_id=&event_type=&limit=` |

### Metrics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/metrics/overview` | System-wide overview (missions, proposals, agents, cost) |
| `GET` | `/api/metrics/agents/:id` | Per-agent metrics |
| `GET` | `/api/metrics/costs` | Cost breakdown. Query: `?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| `GET` | `/api/metrics/timeline` | Timeline data for charts. Query: `?days=30` |

### Workers

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workers/status` | Queue status (waiting, active, completed, failed counts) |
| `POST` | `/api/heartbeat` | Evaluate trigger rules |

### Headers

All responses include `X-Request-Id` header for request tracing. Pass `X-Request-Id` on requests to correlate logs.

## Docker Deployment

```dockerfile
# Dockerfile (apps/api)
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json bun.lockb ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm install --production

FROM node:22-alpine
WORKDIR /app
COPY --from=base /app .
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - '3001:3001'
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
```

## Observability

- **Structured logging**: JSON logs with timestamp, service, level, message, metadata
- **Request tracing**: `X-Request-Id` flows through all requests and logs
- **Health checks**: `/api/health` (deep) and `/api/health/ready` (readiness probe)
- **Alerts**: Automatic alerts for mission failures, budget overruns, retry exhaustion, stale steps
  - Console output (always)
  - Webhook delivery (set `ALERT_WEBHOOK_URL`)
  - Built-in deduplication with 5-minute cooldown

## Testing

```bash
cd apps/api
bun test           # or: npx vitest run
bun test:watch     # watch mode
```
