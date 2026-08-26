# Architecture

This document explains the technical design of the Phase 1 build and the
reasoning behind the major decisions. For product scope/rationale see
[PRODUCT.md](./PRODUCT.md); for setup see [README.md](./README.md).

## Monorepo layout

```
fitness-app/
├── apps/
│   ├── api/          Fastify backend
│   └── mobile/        Expo Router mobile app
└── packages/
    └── shared/         zod schemas shared by both apps
```

**npm workspaces**, not pnpm/turborepo — the repo is two apps plus one shared
package; workspace tooling beyond what npm ships natively wasn't earning its
keep. Revisit only if build/test iteration speed becomes a real problem.

`packages/shared` holds the zod schemas that the API and mobile app must
agree on byte-for-byte — most importantly the structured food-extraction
contract (spec section 34) and the request/response DTOs for every route.
Both apps import the raw `.ts` source directly (no build step): the API runs
it through `tsx`, and Metro (configured for monorepo support in
`metro.config.js`) bundles it directly for the mobile app.

## Backend

**Fastify**, not NestJS. Nest's DI-container/decorator ceremony is more
machinery than a codebase this size needs. Routes are organized as
`modules/{auth,users,onboarding,food,exercise,events,coach,dashboard}`, each
with `*.routes.ts` (HTTP layer, zod validation) / `*.service.ts` (business
logic, framework-agnostic) / occasionally a focused helper file (e.g.
`confidence.ts`, `daily-summary.ts`, `exercise/calorie-burn.ts`).

Fastify is decorated with cross-cutting concerns via plugins
(`src/plugins/`): `prisma` (DB client), `auth` (`@fastify/jwt` + an
`authenticate` preHandler), `providers` (the AI/Speech/Nutrition/Health
provider instances, selected once at boot by env flag).

### Provider abstraction pattern

Every external dependency (AI, Speech, Nutrition, Health data) follows the
same shape:

```
src/providers/<domain>/
  <domain>-provider.interface.ts   the contract
  mock-<domain>.provider.ts        deterministic mock implementation
  <real-provider>.provider.ts      real implementation (or a stub for later)
  <domain>.factory.ts              env-flag switch, called once at app boot
```

Business logic (`food.service.ts`, etc.) only ever depends on the interface
type — never a concrete provider — so swapping providers means implementing
the interface and flipping an env flag, with zero changes to route handlers
or persistence logic. `AIProvider` has both: `openai.provider.ts` is a real,
working implementation (OpenAI Responses API + structured output — see
README's "AI configuration" section for setup and the confidence-calibration
notes); `SpeechProvider`/`NutritionService`/`HealthDataProvider`'s real
implementations are still stubs, since no Whisper/USDA/Health Connect
credentials were available to build against.

`AIProvider` has two distinct methods for two distinct kinds of LLM call:
`extractHealthEvents()` — structured extraction, validated against a zod
schema, used for logging — and `coachChat()` — open-ended conversational text,
used for the Coach (see below). They're deliberately kept separate: the
extraction path's output is trusted data that drives persistence and
calorie math, so it goes through the strict structured-output/zod boundary
in section 34; the chat path's output is advice shown to the user, so it's
plain text with no downstream numeric trust placed in it.

### The health-event interpretation pipeline (spec sections 10 and 16)

A single voice/text utterance can describe either food ("I ate a banana") or
a physical activity ("I played badminton for 30 minutes", "I walked 1000
steps") — spec section 16, "Voice Beyond Food". One endpoint and one
pipeline handle both, branching on what the LLM (or mock parser) says the
utterance was actually about:

```
text (typed or "transcribed")
  → AIProvider.extractHealthEvents()             (mock: keyword parser; tries exercise vocabulary first, food second)
  → validate against HealthExtractionResultSchema   (discriminated union of food | exercise — section 34 boundary)
  → branch on event.type:
      "food"     → NutritionService.lookup() per item → classifyItemConfidence/classifyMealConfidence → shouldAutoLog()
      "exercise" → calculateCaloriesBurned()      (deterministic MET formula — see below, NEVER the LLM)
                 → classifyItemConfidence/shouldAutoLog on the LLM's own extraction confidence
  → return unpersisted InterpretedMeal | InterpretedActivity
```

Implemented in `apps/api/src/modules/events/event.service.ts` (the
orchestrator, `POST /events/interpret`), which delegates to
`modules/food/food.service.ts` (`interpretFoodEvent`) or
`modules/exercise/exercise-interpret.service.ts` (`interpretExerciseEvent`).
Persistence is a separate step per type (`POST /food/entries` or
`POST /exercise/entries`) — same reasoning as before: the same interpret
pipeline serves both the voice/AI-interpreted flow and manual text entry,
since "manual entry" in this build means typing directly into the interpret
pipeline rather than a parallel structured-form entry mode (see PRODUCT.md
for why).

### Activity logging and the calorie-burn engine

The single most important invariant of this feature, stated explicitly by
the product owner: **calories burned must never be computed or stated by the
LLM.** The AI provider's job for an exercise event is limited to extracting
the *facts* — activity type, duration, steps, distance, intensity — never a
calorie number. This is enforced twice:

1. The OpenAI system prompt (`openai.provider.ts`) explicitly instructs the
   model never to compute or state calories burned.
2. Structurally: `OpenAIExerciseEventSchema` and the internal
   `ExerciseExtractionEvent` type have no `caloriesBurned` field at all — even
   if a model ignored the prompt, there's nowhere in the schema for that
   number to go.

`apps/api/src/modules/exercise/calorie-burn.ts` is the actual calculation —
a pure, deterministic function using standard Compendium-of-Physical-
Activities MET (Metabolic Equivalent of Task) values:

```
calories = MET(activityType, intensity) × weightKg × (durationMinutes / 60)
```

If the user gave steps or distance instead of a duration, `resolveDurationMinutes()`
converts them to an estimated duration first (steps ÷ 100 steps/min; distance
÷ an activity-specific average speed) before the formula runs — so the
formula always operates on a duration, and calorie math never touches steps
or distance directly. `weightKg` comes from the user's `Profile.currentWeightKg`,
falling back to `DEFAULT_WEIGHT_KG` (70kg) if unset.

Exercise entries roll up into `DailySummary.activeCalories` /
`exerciseDurationMin` alongside the existing nutrition totals
(`modules/daily-summary.ts`'s `recomputeDailySummary()` now aggregates both
`FoodEntry` and `ExerciseEntry` in parallel). The Home dashboard and the
Coach's remaining-budget calculation both add `activeCalories` back onto the
day's calorie budget — burning calories widens how much the user can eat,
the same "eat back your exercise calories" logic most fitness apps use.

### Coach (spec sections 22-25, pulled forward from Phase 3)

The Coach answers requests like *"I want to prepare a dish for evening
snacks with peanuts"* — grounded in the user's actual state, not
free-floating advice — and supports a follow-up *"give me the recipe"* in
the same conversation.

```
buildCoachContext(prisma, userId)     deterministic — calorie/protein budget (incl. activity calories
                                       added back), remaining calories, diet type, allergies, frequently
                                       eaten foods (last 14 days of FoodEntry), today's already-logged meals
        ↓
sendCoachMessage()                    persists the user's message, loads/creates the user's single ongoing
                                       AiConversation, calls AIProvider.coachChat(history, context),
                                       persists the assistant's reply (with the context snapshot in
                                       AiMessage.contextJson for later debugging), returns both messages
```

`apps/api/src/modules/coach/`:
- `coach-context.service.ts` — `buildCoachContext()` plus pure, unit-tested
  helpers (`computeFrequentFoods`, `summarizeTodaysMeals`,
  `computeRemainingCalories`) that don't touch the DB.
- `coach-chat.service.ts` — `sendCoachMessage()` / `getCurrentConversation()`.
- `coach.routes.ts` — `GET /coach/conversation`, `POST /coach/messages`.

Phase 1 deliberately keeps **one ongoing conversation per user** rather than
modeling multiple named threads (`AiConversation.findFirst` ordered by
`updatedAt`) — matches a "one Coach to talk to" UX and avoids
conversation-management UI the spec doesn't ask for.

Safety is layered the same way as food/exercise: the *facts* the reply must
respect (diet type, allergies, remaining budget) are gathered
deterministically and injected into the system prompt as hard constraints
("CRITICAL — never suggest a dish containing these allergens"), never left
to the model to infer or remember. `mock-ai.provider.ts`'s `coachChat()`
(`coach-chat-utils.ts`) is a small rule-based responder — a curated dish
list filtered by diet/allergy, with a recipe-follow-up path that looks back
through the conversation for the most recently suggested dish name — good
enough to exercise the full suggest → follow-up-recipe UX with zero API
credentials, same philosophy as the food/exercise mocks.

### Confidence tiers (spec section 11)

`modules/confidence.ts` is a small set of pure functions, shared by both the
food and exercise interpretation paths:

- `classifyItemConfidence(score)` — `score >= 0.8` → high, `>= 0.5` → medium, else low.
- `classifyMealConfidence(tiers)` — worst tier across all items in the meal.
- `shouldAutoLog(tier, userSetting)` — only high tier AND opted-in.

The *calibration* of what confidence a food item deserves is the extraction
provider's responsibility (mock or real) — e.g. `MockAIProvider` scores an
exact food name with an explicit quantity at 0.9, a generic name ("curry")
with an explicit quantity at 0.55, and a generic name with no quantity
("some curry") at 0.25. This keeps the threshold logic itself trivially unit
testable and provider-agnostic.

### Daily aggregation (spec section 14/15)

`DailySummary` rows are **recomputed from source events** — nutrition totals
from `FoodEntry` → `FoodItem` → `NutritionRecord`, plus `activeCalories` /
`exerciseDurationMin` from `ExerciseEntry` — on every create/edit/delete,
rather than incrementally patched. See `modules/daily-summary.ts`'s
`recomputeDailySummary()`, which aggregates both in parallel. This trades a
few extra DB reads for correctness-by-construction: edits and deletes can
never drift the summary out of sync with reality, which incremental +/-
bookkeeping is prone to.

### Auth

Email/password + short-lived JWT access tokens + DB-backed opaque refresh
tokens (HMAC-peppered before storage, rotated on every refresh call). Google
Sign-In is **deferred** — it requires an Expo Dev Build (not available in
plain Expo Go) plus a Google Cloud OAuth app, and none of the Phase 1
acceptance criteria need it. `User.authProvider`/`googleId` columns already
exist so it's additive later, not a schema migration.

## Database

Full spec section-32 table list is modeled in `prisma/schema.prisma` now —
UUIDs, timestamps, indexes — so Phase 2-4 features can be built without
destructive migrations. `User`, `Profile`, `Goal`, `DietPreference`,
`Allergy`, `HealthCondition`, `FoodEntry`, `FoodItem`, `NutritionRecord`,
`DailySummary`, `ExerciseEntry`, `AiConversation`, `AiMessage`, `WaterEntry`,
`SleepEntry`, `WeightEntry`, `NotificationPreference`, `FavoriteFood`, and
`FrequentMeal` all have real service logic. The rest (`HealthIntegration`,
`Medication`, `HealthMetric`, etc.) still exist as schema-only scaffolding.

### Water, weight, and sleep logging (spec sections 17-19)

`modules/{water,weight,sleep}/` follow the same `*-entries.service.ts` /
`*.routes.ts` shape as food/exercise. Two things worth calling out:

- **Sleep duration is always computed server-side** from `sleptAt`/`wokeAt`
  (`sleep/sleep-duration.ts`'s pure `computeSleepDurationMinutes()`) — the
  same "never trust a client-computed derived number" principle as the
  calorie-burn engine, just for a much simpler calculation. A sleep entry
  where `wokeAt` isn't after `sleptAt` is rejected with a 400.
- **Logging a new current weight recalculates targets**, not just once at
  onboarding: `onboarding/recalculate-targets.ts`'s `recalculateProfileTargets()`
  re-runs the same `calculateTargets()` BMR/TDEE formula used by
  `completeOnboarding`, so calorie/protein/water targets track the user's
  real weight over time instead of going stale. A weight entry only updates
  `Profile.currentWeightKg` if it isn't older than the most recent existing
  entry, so back-filling a past weight can't clobber a more recent one.

All three roll into `DailySummary` the same way food/exercise do —
`daily-summary.ts`'s `recomputeDailySummary()` now also sums `WaterEntry.amountMl`
and `SleepEntry.durationMin` for the day. Sleep is bucketed by `wokeAt`, not
`sleptAt` — a night's sleep is credited to the day the user woke up (most
sleep trackers use this convention, and it avoids the entry usually landing
on the previous calendar day).

Notification preferences (`modules/notifications/`) are a plain per-category
enable + preferred-time CRUD, defaulting every category to enabled with no
preferred time until the user customizes it (no row needs to exist yet).
Backend-side this is preferences-only; the mobile app is what turns a saved
preference into an actual notification — see "Reminder delivery" under
Mobile app below.

### Favorite foods and frequent-meal suggestions (spec section 28)

Two related but deliberately separate mechanisms, both rolling up to the
same `POST /food/entries` persistence path:

- **`FavoriteFood`** (`modules/favorites/`) is explicit: the user names and
  saves a specific set of items from a past meal (`POST /favorites`), and
  `POST /favorites/:id/log` re-logs those exact items as a real `FoodEntry`
  right now — skipping AI interpretation entirely, since the items are
  already known-good. This is the only way a `FoodEntry` gets created
  without going through `interpretFoodEvent`.
- **`FrequentMeal`** (`modules/food/frequent-meal-tracking.ts`) is passive
  and automatic: every successful `createFoodEntry` call — regardless of
  whether it came from AI interpretation or from re-logging a favorite —
  upserts a `FrequentMeal` row keyed by `computeMealSignature()` (mealType +
  the sorted, lowercased set of item names, ignoring quantity so casual
  voice logging still counts as a repeat). `GET /frequent-meals` only
  returns combinations logged at least twice. Nothing here creates a
  `FoodEntry` — the client's only action on a frequent meal is saving it as
  a `FavoriteFood`, so there's exactly one quick-log mechanism, not two.

Coach's "frequently eaten foods" signal (`coach-context.service.ts`) is
intentionally *not* backed by either of these tables — it's still computed
ad hoc from raw `FoodEntry` history, a separate, lower-stakes heuristic.

## Mobile app

Expo Router with route groups gating navigation by auth/onboarding state
(the standard Expo Router "protected routes" pattern — each group's own
`_layout.tsx` redirects, rather than a single central router):

```
app/
├── _layout.tsx          providers (QueryClient, SafeArea), auth hydration, root Stack
├── (auth)/               login/register — redirects to "/" if already authenticated
├── (onboarding)/          6-step flow — redirects to /login if unauthenticated
├── (tabs)/                Home/Food/Progress/Coach/Profile — redirects to /login or
│                          /account (onboarding) as needed
├── log-meal.tsx           modal — the voice/text logging flow (food AND exercise)
├── log-weight.tsx         modal — single weight input
├── log-sleep.tsx          modal — wake time + hours slept
├── edit-body-info.tsx     modal — pre-filled from /me, PATCH /me/profile
├── edit-goals.tsx         modal — pre-filled from /me, PATCH /me/goals
├── edit-diet.tsx          modal — pre-filled from /me, PATCH /me/diet
├── edit-allergies.tsx     modal — pre-filled from /me, PATCH /me/allergies
├── edit-health-conditions.tsx  modal — pre-filled from /me, PATCH /me/health-conditions
└── meal/[id].tsx          meal detail — edit/delete/duplicate/save as favorite
```

`log-meal.tsx` interprets an utterance via `POST /events/interpret` and
branches on the returned event's `type`: a food event renders the existing
`InterpretationCard` (edit quantities, remove items, confirm); an exercise
event renders `ActivityInterpretationCard` (duration/steps/distance,
calories burned, confirm) and persists via `POST /exercise/entries`. Both
share the same `voiceMachine` state machine — its `interpretation` state now
holds a `{ type: 'food' | 'exercise', ... }` event rather than a bare meal,
so it stays a single state machine instead of two parallel ones. `(tabs)/coach.tsx`
is a real chat screen (`ChatBubble` list + input, `useCoachConversation` /
`useSendCoachMessage` hooks against `POST /coach/messages` and
`GET /coach/conversation`) — no longer a Phase 2/3 placeholder.

`(tabs)/progress.tsx` is likewise a real screen now: weight trend + history
(with a "Log weight" link to `log-weight.tsx`) and sleep history (with a
"Log sleep" link to `log-sleep.tsx`). `log-sleep.tsx` deliberately avoids
adding a native date/time picker dependency (which would mean another native
rebuild) — it takes a 24-hour "HH:MM" wake time plus hours slept as plain
text/quick-pick chips, and derives `sleptAt`/`wokeAt` on the client, but the
server still recomputes `durationMin` itself rather than trusting a
client-sent value. Water logging lives on Home instead of Progress
(`WaterCard`, quick-add buttons for common amounts) since it's a same-day,
repeat-many-times-a-day action rather than a trend to review.

**Editable onboarding answers**: the `edit-*.tsx` modals are deliberately
*not* the onboarding wizard screens reused in place — those are sequential
("step 4 of 6", auto-advance to the next step) and start blank rather than
pre-filled, wrong shape for a standalone edit. Each `edit-*` screen hydrates
its local form state from `useMe()` once on mount, then does a single
`PATCH` and navigates back — no forced march through the rest of onboarding.
The backend routes need no changes to support this: `PATCH
/me/profile|goals|diet|allergies|health-conditions` were always
general-purpose, the onboarding wizard was just their first caller. Editing
body info or the goal also triggers `recalculateProfileTargets()` (the same
helper weight-logging uses), so calorie/protein/water targets never go
stale relative to what the profile actually says.

**Reminder delivery**: `src/lib/notifications.ts`'s `syncScheduledReminders()`
(called from `RemindersCard` whenever preferences load or change) reconciles
`expo-notifications`' OS-scheduled local notifications against saved
`NotificationPreference` rows — cancels a category's existing scheduled
notification by a stable identifier before conditionally re-scheduling it
with a `DAILY` trigger (`{ hour, minute }`), so toggling a reminder or
changing its time never leaves a stale/duplicate notification. Genuinely
local — no push server, no Firebase/APNs.

State is split by concern:
- **Auth identity** (`src/state/authStore.ts`, Zustand) — is the user logged
  in, and their JWT. Tokens live in `expo-secure-store`, never `AsyncStorage`.
- **Server state** (TanStack Query, `src/hooks/`) — profile, dashboard, food
  entries. Mutations invalidate the relevant query keys on success, which is
  what makes the dashboard/food-history screens refresh automatically after
  logging a meal (spec section 50 #11-12) with no manual wiring beyond a
  `queryClient.invalidateQueries()` call.
- **Voice interaction state** (`src/state/voiceMachine.ts`) — a plain
  `useReducer` finite state machine: `idle → recording → processing →
  interpretation → confirm/edit`, with an `error` state that retains the
  original text so nothing typed/spoken is lost on failure (spec section 35).

### Manual entry and voice logging share one pipeline

Rather than building a separate structured item-by-item manual-entry form
(which would need its own nutrition-lookup endpoint), typing a description
into the text field on the log-meal screen and tapping the mic both call the
exact same `POST /events/interpret` → confirm → `POST /food/entries` (or
`POST /exercise/entries`) flow. The only difference is whether the text came
from typing or (in mock mode) a canned quick-phrase standing in for speech.
This is a deliberate Phase 1 simplification — see PRODUCT.md.

### Styling

NativeWind (Tailwind for React Native). Light/dark mode follows the OS color
scheme automatically. A small custom palette (`tailwind.config.js`) uses a
muted teal-green primary rather than a clinical/medical or
bodybuilding-red aesthetic, per the spec's design-language guidance.

## Key risks / known limitations

- **Google Sign-In**: deferred, schema-ready (see Auth above).
- **Real device mic capture**: not implemented. Expo Go's native-module
  limits mean real speech-to-text would need a Dev Build; the log-meal screen
  falls back to typed text / quick-phrase buttons in mock mode, which is
  functionally equivalent for demoing the pipeline.
- **Mock AI vocabulary is bounded**: the rule-based parser only recognizes
  the foods named in the spec's own examples and seed data
  (`apps/api/src/providers/nutrition/food-table.ts`). Anything outside that
  set falls to a low-confidence clarification prompt rather than true NLU —
  expected and by design until a real LLM provider is wired in.
- **Mock nutrition data is illustrative**, not clinically verified — always
  flagged `isEstimate: true` in the API and surfaced as "Estimated" in the UI.
- **This build targets bleeding-edge versions** (Expo SDK 57, React Native
  0.86, React 19.2) — some ecosystem tooling (notably
  `@testing-library/react-native`'s dependency graph in an npm-workspace
  monorepo) hasn't fully caught up; see README's testing section for the
  specific gap and what was done instead.
- **HealthDataProvider** exists as an interface + mock only; no route calls
  it. Home dashboard's steps/sleep fields are `null` (rendered as "not
  connected" rather than a fabricated zero) until Phase 4 wires up Android
  Health Connect.
