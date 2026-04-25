# IronLog

A premium dark-themed mobile-first gym workout tracker. Plan your week, log
workouts fast, track strength progress, body weight, water intake, streaks, and
PRs. Hybrid auth: optional username/password account for cross-device sync, with
guest mode as a frictionless fallback. Local cache + cloud sync with live status
badges (Synced / Syncing / Offline).

## Architecture

pnpm monorepo with two main artifacts:

- **`artifacts/ironlog`** — React + Vite frontend at `/`. Mobile-first with a
  responsive bottom-tab nav that becomes a sidebar at desktop widths. Tailwind +
  shadcn/ui, framer-motion for transitions, recharts for progress charts, wouter
  for routing.
- **`artifacts/api-server`** — Express 5 API server. Routes mounted under `/api`.
  All routes (except `/api/health` and `/api/auth/*`) require an
  `Authorization: Bearer <token>` header. The `authRequired` middleware accepts
  two token formats and sets `req.userId` + `req.isGuest` accordingly.

Shared libraries:

- **`lib/api-spec`** — OpenAPI 3.1 contract (`openapi.yaml`). Run
  `pnpm --filter @workspace/api-spec run codegen` to regenerate Zod schemas
  (`lib/api-zod`) and the React Query client hooks (`lib/api-client-react`).
- **`lib/db`** — Drizzle schema for users, exercises, plan_days, sessions,
  session_exercises, sets, bodyweight, water_intake. Push schema with
  `pnpm --filter @workspace/db run push`.

## Hybrid auth

Two token formats are supported on the same `Authorization: Bearer …` header,
both handled by `artifacts/api-server/src/middlewares/guest.ts → authRequired`:

- `Bearer guest:<uuid>` — a UUID generated client-side on first load and stored
  in `localStorage["ironlog.guestId"]`. Backend upserts a user row keyed by
  `guest_id`. Used while the user has no account.
- `Bearer user:<jwt>` — a 30-day HS256 JWT signed with `SESSION_SECRET`,
  payload `{sub:userId,type:"user"}`. Returned by `/api/auth/login` and
  `/api/auth/signup`, stored in `localStorage["ironlog.userToken"]`.

Auth routes (`artifacts/api-server/src/routes/auth.ts`):

- `POST /api/auth/signup` — bcrypt-hashes password (cost 12), enforces username
  regex `^[a-z0-9_]{3,32}$`, optional `migrateGuestId` attaches the new
  credentials to an existing guest row so all data carries over. Rate limited
  5/min per IP.
- `POST /api/auth/login` — verifies bcrypt hash, returns JWT + profile. Rate
  limited 10/min per IP.
- `GET /api/auth/me` — public probe; returns `{authenticated, profile?}`.

Frontend auth lives in `artifacts/ironlog/src/auth/`:

- `context.tsx` — `AuthProvider` exposes `setUserToken` / `clearSession`,
  registers a `setAuthTokenGetter` returning `user:<jwt>` when present else
  `guest:<uuid>`, and clears React Query cache on auth change.
- Login (`pages/login.tsx`), Signup (`pages/signup.tsx`),
  ForgotPassword (`pages/forgot-password.tsx`) — premium dark UI with the
  IronLog dumbbell brand mark.
- `components/sync-status.tsx` — pill badge (Synced / Syncing / Offline) driven
  by `useIsFetching` + `useIsMutating` + `navigator.onLine`. Tracks
  `localStorage["ironlog.lastSyncedAt"]` for tooltip relative time.

The query client is wrapped with `PersistQueryClientProvider` +
`createSyncStoragePersister` (key `ironlog.cache.v1`, 30-day TTL) so the cache
survives reloads and offline reads. `gcTime` is 14 days so stale data stays
available without network.

Settings page surfaces account state: username + Log Out for authenticated
users, or Sign Up / Sign In CTAs for guests.

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
