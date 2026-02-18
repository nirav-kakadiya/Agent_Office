# Agent Office — Project ARISE

A multi-agent autonomous system with a pixel-art office dashboard. Agents propose, approve, and execute missions through a structured pipeline with cap gates and cost tracking.

## Architecture

- **apps/api** — Fastify API server (proposals → missions → steps pipeline)
- **apps/web** — Next.js 14 pixel-art dashboard with PixiJS canvas and Supabase Realtime
- **packages/shared** — Shared TypeScript types
- **packages/db** — Database migrations (Supabase/Postgres)

## Quick Start

```bash
# Install dependencies
bun install

# Copy env
cp .env.example .env
# Edit .env with your Supabase credentials

# Run the API
cd apps/api && bun dev

# Or with Docker
docker compose -f infra/docker-compose.yml up
```

## Database

Run migrations in order against your Supabase project:

1. `packages/db/migrations/001_initial_schema.sql` — Tables, enums, RLS, seed agents
2. `packages/db/migrations/002_seed_policies.sql` — Default policies, reaction_matrix cooldown column

## Phase 3: Automation Layer

The system is now autonomous with a closed event loop:

**Event → Triggers → New Proposal → Auto-Approve → Mission → Steps → Worker → Event**

### Services
- **Event Service** (`event-service.ts`) — Central nervous system. `emitEvent()` inserts into `agent_events` and evaluates triggers + reactions.
- **Trigger Engine** (`trigger-service.ts`) — Evaluates `trigger_rules` against events. Supports condition matching (event_type, agent_id, tags_include) and cooldowns.
- **Reaction Processor** (`reaction-service.ts`) — Evaluates `reaction_matrix` with probability rolls and cooldowns.
- **Approval Service** (`approval-service.ts`) — Policy-driven auto-approve: checks source, pending count, estimated cost, active missions.
- **Policy Manager** (`policy-service.ts`) — CRUD with in-memory cache (60s TTL) and history tracking.

### New API Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/triggers` | List trigger rules |
| POST | `/api/triggers` | Create trigger rule |
| PATCH | `/api/triggers/:id` | Update trigger rule |
| GET | `/api/reactions` | List reaction matrix |
| POST | `/api/reactions` | Create reaction entry |
| PATCH | `/api/reactions/:id` | Update reaction entry |
| GET | `/api/cap-gates` | List cap gates |
| POST | `/api/cap-gates` | Create cap gate |
| GET | `/api/events` | List events (filter by agent_id, event_type) |

### Default Policies
| Key | Value |
|-----|-------|
| `auto_approve_rules` | max 3 pending/agent, max $1.00 cost, auto-approve trigger/reaction sources |
| `retry_config` | 1s base delay, 30s max, 3 retries |
| `stale_timeout_minutes` | 5 minutes |
| `worker_concurrency` | 3 |

## Agents

| ID | Name | Role |
|----|------|------|
| minion | Minion | executor |
| sage | Sage | strategist |
| scout | Scout | researcher |
| quill | Quill | writer |
| xalt | Xalt | analyst |
| observer | Observer | monitor |
