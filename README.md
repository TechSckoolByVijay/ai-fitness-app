# Fitness Coach — AI Fitness & Nutrition Coach App

A voice-first personal health companion: tap a microphone, say what you ate
or did, and get an interpreted, editable log — food with estimated calories
and macros, or an activity with calories burned — reflected instantly on
your dashboard. An AI Coach can then suggest a meal or snack that fits your
remaining budget and diet, and walk you through the recipe.

This repository contains **Phase 1** of the product plus two features pulled
forward from later phases at explicit request (see [PRODUCT.md](./PRODUCT.md)
for full scope and the deviation note): registration, onboarding, the Home
dashboard, voice/text food **and activity** logging with AI interpretation,
nutrition estimation and deterministic calorie-burn calculation, food
history, and a real AI Coach chat. It runs entirely in **mock mode** — no
external AI, speech, or nutrition API keys are required to demo the full
product loop.

## Product overview

> "I ate a banana." → interpreted as banana / qty 1 / ~105 kcal → confirmed →
> appears in Today's Meals → dashboard calories update.
>
> "I played badminton for 30 minutes." → interpreted as badminton / 30 min /
> ~245 kcal burned (computed deterministically, never by the AI) → confirmed
> → widens today's remaining calorie budget.
>
> "I want a snack with peanuts for evening." → Coach suggests a specific
> dish honoring your diet type, allergies, and remaining budget → "give me
> the recipe" → numbered steps.

See [PRODUCT.md](./PRODUCT.md) for the product principles and full acceptance
criteria this build satisfies, [ARCHITECTURE.md](./ARCHITECTURE.md) for the
technical design and key decisions, and [PLAN.md](./PLAN.md) for a live
done/pending status tracker.

## Tech stack

- **Mobile**: React Native + Expo (SDK 57) + Expo Router + TypeScript + NativeWind (Tailwind) + TanStack Query + Zustand
- **Backend**: Node.js + TypeScript + Fastify
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: Email/password + JWT access tokens + rotating opaque refresh tokens
- **AI/Speech/Nutrition**: Provider-abstraction pattern with mock implementations (see below)
- **Testing**: Vitest (backend), Jest (mobile)
- **Monorepo**: npm workspaces (`apps/api`, `apps/mobile`, `packages/shared`)

## Prerequisites

- Node.js 20+ (developed and tested on Node 24)
- Docker Desktop (for local PostgreSQL)
- npm 10+

## Setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
# Defaults work out of the box in mock mode — no keys required.

# 4. Run database migrations
npm run db:migrate

# 5. Seed a demo user with a populated dashboard
npm run db:seed
# Demo login: demo@fitnessapp.local / demo1234

# 6. Start the backend
npm run dev:api
# API listens on http://localhost:4000, routes under /api/v1

# 7. In another terminal, start the mobile app
npm run dev:mobile
# Press 'w' for web, 'a' for Android (requires Android Studio/emulator or a device with Expo Go)
```

> **Note on ports**: `docker-compose.yml` maps Postgres to host port **5433**
> (not the default 5432) to avoid colliding with any other local Postgres
> instance. `DATABASE_URL` in the `.env.example` files already reflects this.

## Environment variables

### `apps/api/.env`

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://fitness:fitness@localhost:5433/fitness_app` |
| `JWT_SECRET` | Access token signing secret | placeholder — change for any non-local use |
| `JWT_REFRESH_SECRET` | Refresh token HMAC pepper | placeholder — change for any non-local use |
| `PORT` | API server port | `4000` |
| `MOCK_AI` / `MOCK_SPEECH` / `MOCK_NUTRITION` / `MOCK_HEALTH_DATA` | Toggle mock vs real providers | `true` |
| `AI_API_KEY`, `AI_MODEL` | Real AI provider (OpenAI, implemented — see below) | empty |
| `SPEECH_API_KEY` | Real speech provider (not implemented in Phase 1) | empty |
| `NUTRITION_API_KEY` | Real nutrition provider (not implemented in Phase 1) | empty |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Sign-In (deferred, see ARCHITECTURE.md) | empty |

### `apps/mobile/.env`

| Variable | Purpose | Default |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL | `http://localhost:4000/api/v1` |
| `EXPO_PUBLIC_MOCK_SPEECH` | Mobile-side flag mirroring backend mock mode | `true` |

Never commit real secrets. `.env` and `.env.test` are gitignored; only
`.env.example` files are tracked.

## Database

- **Schema**: `apps/api/prisma/schema.prisma` — normalized, UUID primary keys,
  `createdAt`/`updatedAt` timestamps, indexes on common query paths. Includes
  the full table set from the spec, modeled up front so later phases are
  additive, not destructive, migrations. `WaterEntry`, `SleepEntry`,
  `WeightEntry`, and `NotificationPreference` are now fully wired (Phase 2);
  the remaining Phase 3-4 tables (`FrequentMeal`, `HealthIntegration`, etc.)
  still exist as schema-only scaffolding.
- **Migrations**: `npm run db:migrate` (wraps `prisma migrate dev`).
- **Seed data**: `npm run db:seed` — creates a demo user (`demo@fitnessapp.local` / `demo1234`)
  with a vegetarian, weight-loss profile and 4 sample meals (banana + protein
  shake, chapatis + dal + salad, tea, paneer curry + vegetables) at the times
  shown in the spec's own dashboard example, so the app demonstrates itself
  immediately on first run.
- **Inspect data**: `npm run db:studio` opens Prisma Studio.

## Running tests

```bash
# Backend — 94 tests: unit (confidence tiers, nutrition math, zod validation,
# daily aggregation incl. water/sleep sums, calorie-burn formula, sleep
# duration calculation, coach context math, mock coach responder) +
# integration (auth, food logging round-trip, dashboard, exercise logging,
# coach chat round-trip, water/weight/sleep logging, notification
# preferences), run against a real PostgreSQL test database.
cd apps/api
npm test
# `pretest` auto-applies migrations to a separate `fitness_app_test` database
# (create it once: `docker compose exec postgres psql -U fitness -d fitness_app -c "CREATE DATABASE fitness_app_test"`)

# Mobile — voice state machine unit tests (Jest), covering both the food and
# exercise interpretation branches
cd apps/mobile
npm test
```

A note on mobile testing: this build pins bleeding-edge versions (Expo SDK 57,
React Native 0.86, React 19.2) where some testing-library tooling has
dependency-resolution gaps in npm workspace monorepos. The voice state
machine (the core interaction logic) has full unit test coverage; a
component-render test layer (`@testing-library/react-native`) was attempted
but hit an unresolved transitive dependency issue (`test-renderer` module)
specific to this dependency combination — see git history for the attempt.
Backend logic (including the exact same confidence-tier behavior) has full
integration coverage instead. Two Maestro E2E flow definitions exist under
`apps/mobile/e2e/` documenting the intended device-level test coverage; they
were not executed in this environment (no Android emulator or device
available).

## Mock mode

Every external dependency has a provider-abstraction interface with a mock
implementation, selected via env flags:

- `AIProvider` — two mock behaviors, matching the two real methods:
  - `extractHealthEvents()` — a rule-based keyword/quantity parser (see
    `apps/api/src/providers/ai/mock-ai.provider.ts`) that tries the exercise
    vocabulary first (`exercise-parsing-utils.ts`), then falls back to food
    parsing, tuned to hit all three confidence tiers over a bounded food
    vocabulary (see `apps/api/src/providers/nutrition/food-table.ts`).
  - `coachChat()` — a curated-dish rule-based responder
    (`coach-chat-utils.ts`) that filters suggestions by diet type/allergies
    and answers "give me the recipe" follow-ups by looking back through the
    conversation for the most recently suggested dish.
- `SpeechProvider` — mock accepts `text` directly (bypassing "transcription")
  or a `mockTranscriptId` referencing a canned phrase.
- `NutritionService` — mock is a small hardcoded macro table covering the
  spec's own examples and seed data. (Calories *burned*, unlike calories
  *consumed*, never goes through a provider at all — see ARCHITECTURE.md's
  "Activity logging" section for the deterministic MET-based formula.)
- `HealthDataProvider` — mock returns `null`/empty for everything; not wired
  into any Phase 1 route (Android Health Connect integration is Phase 4).

To swap in a real provider later: implement the interface (e.g.
`AIProvider.extractHealthEvents`) against OpenAI/Whisper/USDA FoodData
Central, set the corresponding `MOCK_*=false`, and provide the API key — the
provider factories (`*.factory.ts`) pick the real implementation
automatically once a key is present.

## AI configuration

`apps/api/src/providers/ai/openai.provider.ts` is a real, working implementation
against the OpenAI Responses API (`gpt-4o-mini` by default), using
`zodTextFormat` for strict structured output. To enable it:

```bash
# apps/api/.env
MOCK_AI=false
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini   # optional, this is the default
```

Notes:
- Whatever the model returns is still re-validated against the shared
  `HealthExtractionResultSchema` (a discriminated union of food/exercise
  events) before use (spec section 34's "never trust raw model output"
  boundary applies identically to mock and real providers).
- OpenAI's strict structured-output mode requires every schema field to be
  present (nullable, not optional) — `openai.provider.ts` uses a parallel
  schema for the request and maps `null` back to `undefined` before
  validating against the shared schema, so the rest of the pipeline is
  unaffected.
- A provider's self-reported confidence score isn't perfectly precise at
  tier boundaries (real LLM sampling is noisier than the deterministic mock
  parser). `food.service.ts` applies a deterministic safety net on top: a
  known generic/untyped food name (e.g. "curry" with no type given) can
  never reach the high (auto-log) tier regardless of what any provider
  reports, and is nudged toward the low tier when the provider *also*
  signals real uncertainty — this keeps the safety-critical "never silently
  auto-log an ambiguous item" property (spec section 11) provider-agnostic.
- Nutrition estimates still come from the local mock table regardless of
  `MOCK_AI` — only the interpretation step uses OpenAI; nutrition truth
  stays out of the LLM's hands per spec principle #6, until a real
  `NutritionService` (USDA FoodData Central, etc.) is implemented. Calories
  *burned* never comes from OpenAI at all, mock or real — see
  ARCHITECTURE.md's "Activity logging" section; the system prompt also
  explicitly forbids the model from stating a calories-burned number.
- The Coach's `coachChat()` call is a separate, higher-temperature (0.5 vs.
  extraction's 0.1) plain-text conversation, not a structured-output call —
  see ARCHITECTURE.md's "Coach" section for how diet/allergy/budget facts
  are injected as hard constraints in the system prompt rather than trusted
  to the model's memory.
- Real API calls cost money and add latency (typically 1-3s) — set
  `MOCK_AI=true` for fast, free local iteration on anything that doesn't
  need real free-text understanding.

## Health integration setup (Phase 4, not implemented)

`HealthDataProvider` (`apps/api/src/providers/health/`) defines the interface
Android Health Connect (and later Apple HealthKit) would implement. It exists
now purely as an architecture placeholder.

## Deployment

Not covered in Phase 1. For a production deployment you would, at minimum:
generate strong `JWT_SECRET`/`JWT_REFRESH_SECRET` values, point `DATABASE_URL`
at a managed Postgres instance, run `prisma migrate deploy` instead of
`migrate dev`, build the API with `npm run build && npm start`, and build the
mobile app with `eas build` (Expo Application Services) rather than `expo start`.

## Security considerations

- Passwords hashed with argon2; refresh tokens are opaque random values,
  never stored raw (HMAC-peppered with `JWT_REFRESH_SECRET` before persisting),
  and rotate on every use.
- JWT stored on the mobile client via `expo-secure-store` (Keychain/Keystore-backed),
  never `AsyncStorage`.
- All `/food/*`, `/me/*`, and `/dashboard/*` routes require authentication and
  scope every query to the authenticated user — verified in integration tests
  that a second user cannot read, edit, or delete another user's data.
- Sensitive fields (passwords, tokens) are redacted from logs.
- No secrets are committed; `.env`/`.env.test` are gitignored.
