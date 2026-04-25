# IronLog

A premium dark-themed mobile-first gym workout tracker. Plan your week, log
workouts fast, track strength progress, body weight, water intake, streaks, and
PRs. Guest mode auto-creates a cloud-synced profile per device.

## Architecture

pnpm monorepo with two main artifacts:

- **`artifacts/ironlog`** — React + Vite frontend at `/`. Mobile-first with a
  responsive bottom-tab nav that becomes a sidebar at desktop widths. Tailwind +
  shadcn/ui, framer-motion for transitions, recharts for progress charts, wouter
  for routing.
- **`artifacts/api-server`** — Express 5 API server. Routes mounted under `/api`.
  All routes (except `/api/health`) require a `Authorization: Bearer guest:<uuid>`
  header. The `guestAuth` middleware upserts a user row on first request.

Shared libraries:

- **`lib/api-spec`** — OpenAPI 3.1 contract (`openapi.yaml`). Run
  `pnpm --filter @workspace/api-spec run codegen` to regenerate Zod schemas
  (`lib/api-zod`) and the React Query client hooks (`lib/api-client-react`).
- **`lib/db`** — Drizzle schema for users, exercises, plan_days, sessions,
  session_exercises, sets, bodyweight, water_intake. Push schema with
  `pnpm --filter @workspace/db run push`.

## Guest auth

Frontend (`artifacts/ironlog/src/main.tsx`) generates a UUID on first load,
stores it in `localStorage["ironlog.guestId"]`, and registers an auth-token
getter on the generated API client. Every request goes out with
`Authorization: Bearer guest:<uuid>`. Backend upserts a user row keyed by
`guest_id`. Profile, plan, sessions, stats, body weight, water — all scoped per
guest user.

## Equipment-aware exercise visibility

`artifacts/api-server/src/lib/equipment.ts` defines what the user can see based
on their selected equipment level:

- `full_gym` — sees everything
- `machines_only` — machines + home
- `dumbbells_only` — dumbbells + home
- `home` — home only

The catalog seed (`artifacts/api-server/src/lib/seed.ts`) ships 27 exercises
across chest/back/legs/shoulders/arms/core/full_body and runs at server startup
when the catalog is empty.

## Default plan

On the first `GET /api/plan`, a default Mon-Sun plan is created using the
user's equipment level: Mon Chest, Tue Back, Wed Legs, Thu Shoulders, Fri Arms,
Sat Full Body, Sun Rest.

## PR detection

On `POST /api/sessions/:id` (complete), the server computes Epley 1RM for every
set in the session, takes the per-exercise max, and compares against historical
1RM across all prior completed sessions. New PRs are returned with the
completion summary and an updated `currentStreak`.

## Stats

- `GET /api/stats/summary` — current streak, longest streak, workouts this week,
  workouts all time, total volume all time, consistency score (last 4 weeks),
  last workout day, skipped-leg-day flag.
- `GET /api/stats/volume` — last 12 weeks of total weekly volume.
- `GET /api/stats/frequency` — last 12 weeks of workout count per week.
- `GET /api/stats/strength/:exerciseId` — per-session top 1RM time series.
- `GET /api/stats/prs` — best 1RM per exercise across history.
