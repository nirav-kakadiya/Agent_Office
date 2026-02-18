# Contributing to Agent Office

## Dev Workflow

1. **Install dependencies**: `bun install` from repo root
2. **Start dev servers**: `bun dev` (runs both API + Web via Turbo)
3. **Run tests**: `cd apps/api && bun test`
4. **Type check**: `bun typecheck` (checks all packages)

## Project Structure

```
apps/api/       — Fastify API server
  src/
    routes/     — HTTP route handlers
    services/   — Business logic
    workers/    — BullMQ workers (step-worker, stale-recovery)
    executors/  — Step execution strategies
    lib/        — Config, DB, Redis, Queue, Logger
    types/      — Type re-exports from shared
apps/web/       — Next.js 14 pixel-art dashboard
packages/shared — Shared TypeScript types
packages/db     — Supabase migrations
```

## Adding a New Service

1. Create `apps/api/src/services/your-service.ts`
2. Add a corresponding test `apps/api/src/services/your-service.test.ts`
3. Wire into routes if HTTP-facing
4. Run `npx tsc --noEmit` to verify zero TS errors

## Adding a New Executor

1. Create `apps/api/src/executors/your-kind.ts` implementing `StepExecutor`
2. Register in `apps/api/src/executors/registry.ts`
3. Add a cap gate if needed

## Code Style

- TypeScript strict mode
- ESM imports (`.js` extensions in import paths)
- Structured JSON logging via `createLogger()`
- All new features need tests

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
