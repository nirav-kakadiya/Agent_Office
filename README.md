# Agent Office — Project ARISE

A multi-agent autonomous system with a pixel-art office dashboard. Agents propose, approve, and execute missions through a structured pipeline with cap gates and cost tracking.

## Architecture

- **apps/api** — Fastify API server (proposals → missions → steps pipeline)
- **apps/web** — Next.js pixel-art dashboard (coming soon)
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

Run `packages/db/migrations/001_initial_schema.sql` against your Supabase project.

## Agents

| ID | Name | Role |
|----|------|------|
| minion | Minion | executor |
| sage | Sage | strategist |
| scout | Scout | researcher |
| quill | Quill | writer |
| xalt | Xalt | analyst |
| observer | Observer | monitor |
