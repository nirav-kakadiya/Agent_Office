# Agent Office — Web Dashboard

Pixel art office dashboard built with Next.js 14, PixiJS 8, Tailwind CSS, and Supabase Realtime.

## Features

- **Pixel Art Office Canvas** — PixiJS-rendered top-down office with 9 rooms
- **Programmatic Agent Sprites** — Animated characters with status indicators, thought bubbles, and particles
- **Real-time Updates** — Supabase Realtime subscriptions for live agent state
- **Dark Theme** — Retro pixel aesthetic with Press Start 2P font and scanline overlay
- **Three Pages** — Office view, Missions list, Agent cards

## Setup

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
bun install
bun run dev
```

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_API_URL` — API server URL (default: http://localhost:3001)
