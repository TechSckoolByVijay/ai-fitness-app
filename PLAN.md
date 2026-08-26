# Build Plan & Status

Living status tracker for this build. Updated as work lands — check here for
"what's done vs. what's next" instead of re-deriving it from git history.
For *why* things are scoped the way they are, see [PRODUCT.md](./PRODUCT.md);
for *how* things are built, see [ARCHITECTURE.md](./ARCHITECTURE.md).

Legend: ✅ done & tested · 🚧 partially done · ⏳ not started

## Core (spec Phase 1)

| Item | Status | Notes |
|---|---|---|
| Auth (register/login/refresh) | ✅ | Email/password, JWT + rotating refresh tokens |
| Onboarding (6 steps) + calorie/protein/water targets | ✅ | Mifflin-St Jeor BMR → TDEE, floored at 1200 kcal |
| Home dashboard | ✅ | Calories, protein, water, active calories, meals, activities |
| Voice/text food logging | ✅ | `/events/interpret` → confirm → `/food/entries` |
| AI interpretation (structured, confidence-tiered) | ✅ | Real OpenAI (gpt-4o-mini) + mock provider |
| Nutrition estimation | ✅ | Real USDA FoodData Central provider active (mock table used only as its own internal fallback) — see below |
| Food history (edit/delete) | ✅ | |
| Manual calorie override (slider) | ✅ | The AI's estimate is a starting point, not gospel — see below |
| Real device testing (Android APK via EAS) | ✅ | See "Device testing" below |

## Pulled forward from later phases (explicit request)

| Item | Status | Notes |
|---|---|---|
| Universal voice logging (food *or* exercise) | ✅ | Same `/events/interpret` pipeline, discriminated on event type |
| Deterministic calorie-burn engine | ✅ | MET-based formula, never the LLM — `exercise/calorie-burn.ts` |
| AI Coach (suggest a dish, follow-up recipe) | ✅ | Grounded in real budget/diet/allergy/history, not free-floating advice |
| Coach tab: correct layout + voice input | ✅ | Was broken (messages flush top-right, input field half-width) — root cause + fix below |
| Dark theme toggle | ✅ | Light/Dark/System, under Profile → Appearance |
| Editable onboarding answers | ✅ | Body info, goal, diet, allergies, and health conditions can all be edited anytime from Profile, not just once during onboarding — see below |

## Phase 2 (spec sections 17-19)

| Item | Status | Notes |
|---|---|---|
| Water logging | ✅ | Quick-add card on Home |
| Weight logging | ✅ | Also recalculates calorie/protein/water targets from the new weight |
| Sleep logging | ✅ | Duration always computed server-side, never trusted from client |
| Progress tab (weight trend, sleep history) | ✅ | Was a placeholder; now real |
| Reminder preferences (enable + preferred time per category) | ✅ | Profile → Reminders card |
| **Reminder delivery** (actually sending a notification) | ✅ | Local daily-repeating notifications via `expo-notifications`, scheduled/re-scheduled whenever preferences change — see below |
| Favorite foods ("log my usual breakfast") | ✅ | Spec section 28; pulled forward alongside this batch — see below |
| Frequent-meal auto-suggestions | ✅ | The other half of spec section 28 — auto-detects repeat combos, suggests saving as a favorite — see below |

## Editable onboarding answers

Onboarding originally only ever wrote profile/diet/allergy/health/goal data
once, with no way to revisit it — noticed and flagged during testing.

- `Profile → Body info / Goal / Diet / Allergies / Health conditions` each
  now have their own **Edit** button, opening a dedicated pre-filled modal
  (`edit-body-info.tsx`, `edit-goals.tsx`, `edit-diet.tsx`,
  `edit-allergies.tsx`, `edit-health-conditions.tsx`) rather than reusing
  the onboarding wizard screens directly — those are sequential ("step 4 of
  6", auto-advance to the next step) and don't pre-fill existing values,
  wrong shape for a standalone edit. The backend routes were already
  general-purpose (`PATCH /me/profile|goals|diet|allergies|health-conditions`
  — the onboarding screens were just early callers of them), so this was a
  mobile-only gap plus one backend fix (below).
- Health conditions weren't even *displayed* on Profile before this, let
  alone editable — added.
- Backend fix alongside this: editing body info or the primary goal now
  **recomputes calorie/protein/water targets**, the same way logging a new
  weight already did — previously only true at onboarding completion, so
  editing height/weight/activity/goal afterward silently left targets
  stale. Refactored `recalculateProfileTargets()` to read fresh state from
  the DB rather than take values as parameters, so every caller (onboarding
  completion, weight logging, profile edits, goal edits) can share it.

## Manual calorie override

Raised directly: the AI only ever *identifies* a food (name + quantity/unit)
— actual calories come from a small hardcoded lookup table
(`food-table.ts`), not from the AI itself, and that table can genuinely be
wrong (e.g. it defaults "one banana" to a 118g medium/whole size unless the
user says "small"/"large"). There needed to be a way to correct it.

Added a **slider**, not a text field (explicitly requested) — per food
item, both in the pre-confirm interpretation card (`log-meal.tsx`) and when
editing an already-logged meal (`meal/[id].tsx`). New native dependency:
`@react-native-community/slider` (the standard RN community slider, no
transitive deps, actively maintained — low-risk pick after the worklets
incident).

- **Bounds are relative to the AI's own estimate** (~0.25x-3x, rounded to
  clean 5-kcal steps — `calorieSliderBounds()`), not a fixed absolute range.
  A banana and a bowl of curry don't share a sensible calorie ceiling, so a
  single global min/max wouldn't work well for both.
- **Dragging the slider rescales every macro proportionally**
  (`scaleNutritionToCalories()`) — protein/carbs/fat/fiber/sugar/sodium all
  move with the new calorie value, keeping the AI's macro *ratio* intact
  under the assumption it identified the right kind of food, just not the
  right portion size. Quantity/unit are left untouched — the correction is
  to the nutrition estimate, not to how much the user says they ate.
- The corrected value is saved with `source: 'user_edited'` — that enum
  value already existed in the shared nutrition schema, unused until now, so
  no backend/schema changes were needed at all. Purely a mobile change.

## Reminder delivery & favorite foods

Two more items picked up in the same batch, both self-contained (no
external account/API key needed):

- **Reminder delivery**: `src/lib/notifications.ts`'s `syncScheduledReminders()`
  reconciles OS-scheduled local notifications against saved
  `NotificationPreference` rows — always cancels a category's existing
  scheduled notification by a stable identifier (`reminder-water`,
  `reminder-sleep`) before conditionally re-scheduling it, so toggling a
  reminder off or changing its time never leaves a stale/duplicate
  notification. Runs from `RemindersCard` whenever preferences load or
  change. Uses `expo-notifications`' `DAILY` trigger type (`{ hour, minute
  }`, fires every day at that local time) — genuinely local, no push
  server/Firebase/APNs involved. Only `water` and `sleep` are wired to an
  actual message; the rest of `NotificationCategory` (`meal_suggestion`,
  `goal_progress`, etc.) still has no reminder content defined, matching
  how far the rest of the product goes today.
- **Favorite foods**: `FavoriteFood` (previously schema-only scaffolding —
  added a `mealType` column, missing from the original schema, via a real
  migration) is now fully wired: `POST/GET /favorites`, `DELETE
  /favorites/:id`, and `POST /favorites/:id/log` (re-logs the saved items as
  a real `FoodEntry` right now, reusing the exact same persistence path as
  an AI-interpreted meal — just skipping interpretation entirely since the
  items are already known-good). Mobile: "Save as favorite" on the meal
  detail screen, a horizontal quick-log row on the Food tab. This is the
  spec section 28 gap called out in PRODUCT.md's deferred table — Coach's
  "frequently eaten foods" signal still comes from raw `FoodEntry` history,
  not from this table; that's an intentionally separate, lower-stakes
  heuristic and wasn't changed.

Both needed a native module (`expo-notifications`) so this batch needed one
more full rebuild — bumped `app.json`'s `version` to `1.0.1` per the
`appVersion` runtime-policy discipline noted above.

**Another env-var precedence gotcha, opposite direction from the `eas
update` one**: for `eas build`, `eas.json`'s per-profile `env` block *wins*
over the EAS-hosted "Environment Variables" when both define the same key
(the build log says so explicitly) — the reverse of `eas update`, which
ignores `eas.json`'s `env` block entirely and only reads the hosted vars.
Net effect: **the tunnel URL must be updated in both places** whenever it
changes — `eas.json`'s `preview.env.EXPO_PUBLIC_API_URL` for builds, and
`eas env:set preview --name EXPO_PUBLIC_API_URL --value "<url>" --force`
for OTA updates. Forgetting one leaves that path pointing at a stale URL.

### Frequent-meal auto-suggestions

The other half of the spec section 28 gap, done as a follow-on to Favorite
foods: `FrequentMeal` (also previously schema-only — added `mealType` and a
`signature` column via another real migration, `@@unique([userId,
signature])`) is now auto-tracked. Every successful `createFoodEntry` call
(AI-interpreted, a re-logged favorite, or a duplicate — anything that goes
through that one function) upserts a `FrequentMeal` row keyed by
`computeMealSignature()` — mealType + the sorted, lowercased set of item
names, deliberately ignoring quantity so casual voice logging still counts
as "the same meal." Edits don't re-track (a correction isn't a new
occurrence). `GET /frequent-meals` only surfaces a combination once
`useCount >= 2` — a single log isn't "frequent" yet.

Deliberately kept as a **passive suggestion, not a second quick-log
mechanism**: the Food tab's "You often eat this" row only offers "Save as
favorite" (prompts for a name, creates a real `FavoriteFood`), not its own
instant re-log action — that would've meant two near-identical ways to
quick-log a meal. Once saved, it becomes a normal favorite using the
already-built log flow. The `FrequentMeal` row isn't hidden/consumed once
saved (no dedup between the two lists) — harmless, low-value to build out
further.

This was a pure backend + JS-only mobile change (no native module), so it
shipped via **`eas update`** instead of a rebuild — the actual proof that
the OTA setup above pays off for exactly this kind of work.

## Known layout bugs found & fixed

Two real device rounds surfaced NativeWind/RN layout pitfalls worth noting
since they're easy to reintroduce:

- **`FlatList` + `contentContainerClassName` doesn't reliably apply** in
  this setup — caused the Coach tab's first message to render flush against
  the top-right corner with no padding/gap. Fixed by switching Coach's
  message list from `FlatList` to a plain `ScrollView` + `.map()` (matches
  every other screen in the app, which all use `ScrollView` and were never
  affected). `contentContainerClassName` on `ScrollView` itself is fine and
  used throughout.
- **`TextField`'s `className` prop only reaches the inner `<TextInput>`**,
  not its outer wrapping `<View>` — so `className="flex-1"` inside a
  `flex-row` (e.g. an input-plus-button row) never actually grows the
  field; it was sizing to content instead. Fix is to wrap the `<TextField>`
  in its own `<View className="flex-1">` at the call site rather than
  passing flex classes through `TextField`'s own `className`.
- **No tab screen accounted for the status bar inset** — every tab has
  `headerShown: false`, so nothing reserves that space; worst on Android
  15+'s enforced edge-to-edge display. Fixed with a small shared
  `<TopInsetSpacer />` component (`useSafeAreaInsets()` + a fixed-height
  `View`, deliberately *not* folded into a className/contentContainerStyle
  value given the `FlatList` issue above) added as the first child on all
  five tab screens.

## Progress tab trend charts

Answers "is my calorie/protein intake rising or falling" without making the
user read raw numbers. `GET /dashboard/history?days=N` (default 14) returns
zero-filled daily `DailySummary` rows (`apps/api/src/modules/dashboard/
dashboard.service.ts#getDashboardHistory`) plus the user's calorie/protein
targets. Mobile renders two cards on the Progress tab (calorie intake,
protein intake), each with:
- A plain-English trend sentence (`src/utils/trend.ts#summarizeTrend` —
  compares first-half vs second-half average of the window, "trending up/down
  N%" or "holding steady").
- A hand-rolled bar chart (`src/components/ui/TrendBarChart.tsx`) — plain
  `View`s with inline pixel heights, **no charting library / no
  `react-native-svg`**, specifically so this ships via `eas update` (OTA)
  instead of requiring a rebuild. Bars past the calorie target render amber
  instead of green so over/under-target reads at a glance; protein bars don't
  recolor past target since more protein isn't a bad thing.
- For calories specifically, an extra line: "Under your N kcal target on X of
  Y logged days."

## Real USDA nutrition provider

Previously `apps/api/src/providers/nutrition/usda.provider.ts` was an
unimplemented stub. It's now a real implementation against [USDA FoodData
Central](https://fdc.nal.usda.gov)'s public search API, restricted to the
Foundation/SR Legacy data types (per-100g values, not per-branded-serving —
avoids false matches like "Apple Jacks cereal" for "apple"). Shared
`applyPreparationAdjustment`/`FALLBACK_PER_100G` logic was factored out of
`mock-nutrition.provider.ts` into `nutrition-adjustments.ts` so both
providers use identical prep-method scaling.

**Never throws** — a no-match search result or any network/API error falls
back to the same generic per-100g estimate the mock provider always used
(logged as a `console.warn`, not surfaced to the user), so an outage or an
obscure food name degrades quality rather than breaking meal logging.

**Activation**: DONE — user's real key is set (`NUTRITION_API_KEY` +
`MOCK_NUTRITION=false` in `apps/api/.env`), server restarted, live-verified
against the real API (apple, almonds, broccoli all resolved to realistic
per-100g values). No mobile changes, no rebuild — entirely a backend swap
behind the existing `NutritionService` interface.

**Two real bugs found and fixed during that live verification** (not caught
by the mocked unit tests written before a real key existed):
1. **kJ read as kcal.** FDC lists "Energy" twice per food — once in kJ, once
   in KCAL — both under the *identical* `nutrientName: "Energy"`. The
   original lookup matched by name only and grabbed whichever came first
   (kJ, in practice) — a 100g apple came back as 1060 "calories". Fixed by
   also requiring `unitName === 'KCAL'`.
2. **Wrong food matched.** A bare query like "apple" ranks dishes that
   merely *mention* the food above the plain food itself — "Croissants,
   apple" outranked "Apples, ... raw"; "Flour, almond" outranked "Nuts,
   almonds ... raw" — because USDA names generic foods
   "Category, variety, ..., raw" (comma-separated, category first), not
   "food-name first". Fixed in `pickBestMatch()`: fetch 10 candidates
   (was 1), tokenize each description on commas/whitespace (deliberately
   *not* all punctuation — a hyphenated compound like "Rose-apples" must
   stay one token, or it wrongly matches a plain "apple" query), and prefer
   a candidate containing the query word *and* "raw" over the top
   relevance-ranked hit.
3. **Bonus, same investigation:** "Foundation" dataset foods (unlike SR
   Legacy) often have no plain "Energy" nutrient at all — only
   "Energy (Atwater General/Specific Factors)". Almonds' Foundation entry
   hit this and silently fell back to the generic 150 kcal placeholder.
   `findEnergyKcal()` now falls back to Atwater Specific Factors (computed
   from that food's own measured macros — preferred over General/average)
   before giving up.

13 unit tests cover all three (mocked FDC response fixtures matching the
real shapes discovered above), plus the 3 live spot-checks.

## In-app account deletion

Google Play's User Data policy requires any app that supports account
creation to also support in-app account deletion — this was completely
missing and would have blocked a Play Store submission. Now implemented:
`DELETE /me` (`apps/api/src/modules/users/users.service.ts#deleteAccount`)
requires the user's password for email/password accounts as a safeguard
(a stolen access token alone can't nuke the account), then a single
`prisma.user.delete()` — every user-owned table already had `onDelete:
Cascade` in the schema, so all food entries, meals, conversations, etc. are
cleanly removed with it. Mobile: Profile tab → "Danger zone" card →
password-confirm inline form → `useDeleteAccount` clears the session and the
auth-gated layout redirects to login automatically (same mechanism as
logout).

## Always confirm before logging (auto-log disabled)

High-confidence meals/activities (e.g. "I ate a banana") were being silently
persisted immediately after interpretation — `DEFAULT_AUTO_LOG_SETTING` was
hardcoded `true` in both `food.service.ts` and `exercise-interpret.service.ts`.
This meant voice logging in particular could save an entry (and navigate
away) before the user ever got a chance to see the estimate or use the
calorie slider to correct it. Reported by the user as broken UX — fixed by
flipping the default to `false` in both files, so every interpretation
(voice or text, any confidence tier) now always stops at the
confirm/edit screen. `shouldAutoLog()` itself was already correct
(`tier === 'high' && setting`); no per-user override setting exists yet, so
this is a global default change. Backend-only — no mobile change, no
OTA/rebuild needed, picked up immediately by the running dev server.

## App version visible in-app

Directly caused by the moto g54 debugging session above: the user had an
older APK installed than they thought, and there was no way to tell from
inside the app. Profile tab now has an "About" card
(`src/utils/appInfo.ts#getAppInfo`) showing the app version (from
`expo-constants`'s `Constants.expoConfig.version`), whether the currently
running JS is the build's embedded bundle or an OTA-fetched one (and when,
via `expo-updates`'s `Updates.isEmbeddedLaunch`/`createdAt`), and the update
channel. Both native modules were already linked in the existing build, so
this ships via OTA with no rebuild.

## Calorie slider runaway bug fixed + narrowed range

User-reported: dragging the calorie slider even briefly produced absurd
values (screenshot showed 2 chapatis at 5,510,145 kcal). Root cause: bounds
were recomputed every render from the item's *live* calories
(`calorieSliderBounds(item.nutrition.calories)` in both
`InterpretationCard.tsx` and `app/meal/[id].tsx`) — since dragging changes
that live value, each `onValueChange` widened `minimumValue`/`maximumValue`,
which the native slider then reinterpreted the same finger position
against, producing a larger value even from a stationary finger. Pure
feedback loop, exponential within one gesture.

Fixed by freezing bounds against a baseline that only updates when
*quantity* changes (the +/- buttons), never when the slider itself moves —
`src/utils/calorieSliderBaseline.ts#nextCalorieBaseline` (pure, unit
tested) wrapped by `src/hooks/useCalorieSliderBounds.ts` (keyed by
`meal.sourceText`/entry id so a brand-new interpretation doesn't inherit
stale baselines from a previous one at the same item index).

Also narrowed the range itself per explicit user feedback: 0.25x-3x was way
too wide — "if someone wants 200 kcal for what's realistically ~120, let
them log 3 chapatis instead of stretching the slider." Now 0.6x-1.5x
(`calorieSliderBounds` in `nutritionOverride.ts`) — a plausible-correction
range, not a stand-in for changing quantity. Backend untouched — pure JS,
shipped via OTA.

## Three user-reported bugs fixed (water calories, two-tap voice, cross-tab voice leak)

1. **"Glass of water" logged as ~150 kcal.** Water wasn't in the mock food
   table, so it fell through to `FALLBACK_PER_100G` (a generic 150 kcal/100g
   placeholder meant for genuinely unknown foods). Added a proper `water`
   entry (0 kcal/protein/carbs/fat, `glass`/`cup`/`bottle`/`liter` unit
   conversions) to `food-table.ts`. Also removed the calorie slider's
   artificial 5 kcal floor (`nutritionOverride.ts`) — a real ~0-calorie item
   can now actually be dragged to 0, not stuck at a minimum. Backend-only,
   already live on the dev server (verified directly).

2. **Voice logging required two taps** (tap mic on Home → land on an
   *idle* screen → tap mic again to actually start listening). The first
   tap already IS the "I want to speak" gesture. `log-meal.tsx` now
   auto-starts the recording session on mount (`useEffect` + a ref guard so
   it only fires once) — typing is still available on the very next screen
   for anyone who prefers it.

3. **Voice logged for a meal was also appearing as a Coach chat message.**
   Root cause: `expo-speech-recognition`'s events are global (one native
   session, not scoped per screen), and React Navigation's bottom-tab
   screens (Coach included) stay mounted in the background when you
   navigate away from them via a stack push (like `/log-meal`). Every
   mounted `useVoiceRecognition()` instance — including Coach's, sitting
   inactive in the background — was receiving every recognition result
   app-wide. Fixed with an `isActiveRef` guard in
   `useVoiceRecognition.ts`: each hook instance now only reacts to events
   from a session *it* itself started via `start()`, ignoring global events
   from any other screen's session. A manual `stop()` still correctly
   receives the final result (the guard clears on the subsequent `end`
   event, not synchronously in `stop()` itself).

All three mobile-side fixes (#2, #3, and the slider floor half of #1) are
pure JS — shipped via OTA, no rebuild.

## Swagger/OpenAPI docs + rate limiting

Added `@fastify/swagger` + `@fastify/swagger-ui` (`app.ts`) — live at
`/docs` (disabled when `NODE_ENV=test` to keep the test suite fast). Wired
`fastify-type-provider-zod` (v5, the last major compatible with the
project's zod v3 — v6/v7 require zod v4) globally too, so any route that
adopts a `schema: {}` option going forward gets full request/response body
docs automatically; existing routes that still validate via manual
`SomeSchema.parse()` inside the handler just show up with path/method only,
not an error. Retrofitting every existing route's schema is a separate,
larger follow-up if full body-shape docs matter later.

Also added `@fastify/rate-limit`: 200 req/min per IP app-wide, tightened to
10 req/min on `/auth/register` and `/auth/login` specifically — added while
preparing for a public deployment, where credential-stuffing/brute-force
becomes a real (not hypothetical) concern. All 135 backend tests still pass
(no test file's cumulative register/login calls exceed the limit).

## Azure deployment — prepared, not yet executed

User wants to deploy to production now, in the existing `fitness-app`
resource group (subscription `d52d8c18-504a-45e8-8997-9c004316124c`,
"Visual Studio Enterprise Subscription"). **Blocked on `az login`** — the
CLI's cached token expired (90 days inactive); needs an interactive
re-login only the user can do (`az login --tenant
ab834a0e-d914-4111-9d90-210d9c0c5212`).

**Decision: Azure Container Apps (Consumption plan), not App Service.** For
~5-6 users, Container Apps' scale-to-zero + monthly free grant (180k
vCPU-seconds / 360k GiB-seconds / 2M requests) very plausibly keeps compute
at $0; App Service's cheapest always-on tier (B1) is a flat ~$13/mo
regardless of traffic. Paired with Azure Database for PostgreSQL Flexible
Server, Burstable B1ms (cheapest non-free tier, ~$15/mo baseline — no
scale-to-zero for a managed database) — also worth checking whether this
subscription's free-tier promo covers B1ms for 12 months.

**Real bugs found and fixed while preparing this** (would have broken the
first production deploy):
1. `npm start` was completely broken — `tsc` compiled to `dist/src/server.js`
   (since `test/`/`prisma/` were in the same `tsconfig.json`'s `include`,
   pulling `src/` into the output path) but `start` pointed at
   `dist/server.js`. Fixed with a dedicated `tsconfig.build.json`
   (`rootDir: "src"`, `include: ["src"]` only).
2. The compiled output also used ES module `import` syntax while
   `package.json` says `"type": "commonjs"` — Node refused to run it. Fixed
   by forcing `module: "CommonJS"` / `moduleResolution: "Node10"` in
   `tsconfig.build.json`.
3. Even after both fixes, `@fitness-app/shared` ships as raw `.ts` (its
   `main`/`types` point at `src/index.ts`, consumed directly by both this
   API and the mobile Metro bundler) — plain `node` can't resolve that.
   Rather than giving the shared package its own build step (which would
   need a `tsc --watch` added to the dev workflow too, and risks the mobile
   bundler), the **Docker image runs via `tsx`** (`apps/api/Dockerfile`),
   the same execution mode already proven all session in local dev — at
   this scale the transpile-on-boot cost is irrelevant.
4. **Caught before it left this machine**: the first local Docker build
   leaked real secrets (`OPENAI` key, USDA key) into the image — an
   unprefixed `.env` line in a fresh `.dockerignore` only matched the build
   context *root*, not `apps/api/.env`. Fixed to `**/.env` /`**/.env.*`
   (matching the `**/`-prefixed style already used for `node_modules`
   etc.), leaky image deleted (`docker rmi -f` + `docker system prune`),
   rebuilt clean and re-verified the file isn't in the image.

**Validated locally, end-to-end, before anything touches Azure**: built the
image (`docker build -f apps/api/Dockerfile .`), ran it against the local
Postgres via `host.docker.internal`, registered a real user through it
(confirms Prisma/DB connectivity from inside the container), and hit
`/docs`. All passed.

**Ready to deploy, waiting on `az login`**:
- `infra/main.bicep` — Postgres Flexible Server (B1ms, firewalled to
  Azure-internal traffic only, not the open internet) + Container Apps
  environment + the API container app (secrets for DB URL/JWT
  secrets/AI keys passed as secure params, never hardcoded). Not yet
  dry-run against real Azure (`az deployment group what-if` should be the
  first real command once logged in — zero-risk preview before creating
  anything).
- `.github/workflows/deploy-api.yml` — builds the Docker image, pushes to
  GHCR (free, uses the built-in `GITHUB_TOKEN`, no extra registry cost),
  then `az containerapp update`s the running app to the new image. Needs
  one GitHub secret once the Container App exists: `AZURE_CREDENTIALS` (a
  service principal — can create this together once `az login` works).

**Public exposure / access control** (user's question, answered): yes, the
Container App gets a public HTTPS URL by design — a phone anywhere needs to
reach it, same as the ngrok tunnel today just without your laptop needing
to stay on. That's not the same as being open to abuse: every route except
register/login/refresh requires a valid JWT (`app.authenticate`
preHandler); TLS is automatic (Container Apps manages the cert); the
Postgres server itself is firewalled to Azure-internal traffic, not
public; secrets live only in Container App secrets / GitHub Secrets, never
shipped to the mobile app. The one real gap this surfaced was rate
limiting, now fixed (above).

## Known follow-ups (not yet done)

- Finish the Azure deployment once the user re-runs `az login` — validate
  the Bicep with `what-if`, provision, create the `AZURE_CREDENTIALS`
  service principal for GitHub Actions, deploy, then point
  `EXPO_PUBLIC_API_URL` at the real URL instead of the ngrok tunnel.

## EAS Update (OTA) — set up

The rebuild-per-change pain from earlier in this session is fixed. `expo-updates`
is installed and configured (`app.json`'s `updates.url` +
`runtimeVersion: { policy: "appVersion" }`, `eas.json`'s `preview` profile
has `channel: "preview"`); the build at
`5d715fff-000a-467e-be15-b80f5fcf1722` embeds the updates runtime. First
OTA publish (the Coach markdown-bold fix, below) took under 2 minutes vs.
~15-30 min for a full rebuild.

**Go-forward workflow for JS/asset-only changes** (components, screens,
hooks, styling, most bug fixes — anything that doesn't touch
`app.json`'s native config or add/change a native dependency):
```bash
cd apps/mobile
npx eas-cli update --branch preview --message "what changed" --environment preview --non-interactive
```
The app checks for updates on launch and applies on the *next* launch after
that (standard `expo-updates` behavior — not instant mid-session). No new
install needed, no QR code, just reopen the app twice.

**Trap already hit once — `EXPO_PUBLIC_*` env vars for `eas update` come
from a *different place* than for `eas build`.** `eas.json`'s per-profile
`env` block (where `EXPO_PUBLIC_API_URL` is set to the ngrok tunnel) only
applies to `eas build`. `eas update` bundles the JS locally and reads
`EXPO_PUBLIC_*` from EAS's own hosted "Environment Variables" for the given
`--environment`, falling back to the local `apps/mobile/.env` file (which
has `localhost:4000` for local dev) if nothing is hosted. The first OTA
publish did exactly that and would have shipped `localhost` to the phone —
caught before telling the user to relaunch. Fixed by hosting the var on EAS
itself so every future `eas update` picks it up automatically, no matter
what the local `.env` says:
```bash
npx eas-cli env:set preview --name EXPO_PUBLIC_API_URL --value "<url>" --visibility plaintext --non-interactive
```
Re-run this (or `eas env:set` again with `--force` to overwrite) any time
the tunnel URL changes. `eas update`'s output line confirms which source it
used — it should say *"Environment variables ... loaded from the 'preview'
environment on EAS"*, not *"No environment variables ... found"*.

**Still needs a full rebuild** (this doesn't replace EAS Build, it complements
it): adding/upgrading a native module, changing `app.json`'s native config
(permissions, package name, plugins), or anything under `android/`/`ios/`.
With the `appVersion` runtime-version policy, also bump `app.json`'s
`version` field on any such native change — otherwise a published update
could target a runtime it's not actually compatible with. (`eas update` will
also warn if the local fingerprint looks native-incompatible, but the
version bump is the deliberate signal.)

- Coach replies can contain `**markdown bold**` from the LLM; fixed via the
  first OTA update above (`ChatBubble` now renders it as bold inline text).

## Deferred (not started, spec's own later phases)

| Item | Spec section | Why deferred |
|---|---|---|
| Google Sign-In | 3, 7 | Needs Dev Build + Google Cloud OAuth app; email/password already satisfies the acceptance criterion |
| Real Speech provider (Whisper or similar) | 3, 44 | Native on-device speech recognition already works (`expo-speech-recognition`); no separate cloud speech API wired |
| ~~Real Nutrition provider~~ | 3, 44 | **Done** — see "Real USDA nutrition provider" below. Only remaining step is the user setting `NUTRITION_API_KEY` |
| Android Health Connect / wearables | 20, 21 | Interface + mock exist, no route wired. Evaluated `react-native-health-connect` v4 (2026-08-26): peer deps are loose and it's actively maintained, but its Expo config plugin requires bumping `app.json`'s `compileSdkVersion`/`targetSdkVersion` to 36 project-wide via `expo-build-properties` — not scoped to just this feature, could affect every native module (including possibly reintroducing edge-to-edge issues). Deliberately deferred to do with the user present rather than risk unsupervised, given the worklets-version incident earlier this session |
| Structured multi-day diet plans | 22-25 | Conversational Coach is built; structured plans are not |
| Production deployment (hosting, secrets rotation, `eas build --profile production`) | — | Dev-only so far (local API + ngrok tunnel, internal-distribution APK) |

## Device testing

- Android APK built via EAS (`preview` profile), installed directly (not
  through the Play Store).
- Currently points at an **ngrok tunnel** (`https://lapped-earpiece-cortex.ngrok-free.dev`)
  proxying to the API running locally on this machine — not the LAN IP,
  because of an earlier reachability issue (suspected router client
  isolation) that a tunnel sidesteps entirely. Works over mobile data too.
- **This only works while both the local API server and the ngrok tunnel
  stay running on this machine.** If either restarts, the ngrok URL changes
  and the app needs a rebuild pointed at the new URL.
- **JS/asset-only changes ship via `eas update` in under 2 minutes** (see
  the "EAS Update (OTA)" section above) — no rebuild, just reopen the app
  twice. **Native changes** (new native module, `app.json` native config)
  still need a full EAS Build rebuild + reinstall, ~15-30 min.

## GitHub Actions CI pipeline — drafted, needs one manual step to finish

`.github/workflows/build-android.yml` exists and is ready, but **untested
end-to-end** (I can't dry-run a GitHub Actions workflow from here) — expect
it might need a round of log-reading and small fixes the first time it
actually runs.

Deliberately does **not** reimplement `expo prebuild` + Gradle signing by
hand — earlier plan was to self-manage a keystore, but there's no
non-interactive way to export the *existing* EAS-managed keystore (only an
interactive CLI menu), and building with a *different* one would break
updating the app already on the phone. Instead the workflow runs `eas build
--local`: the actual compile happens on GitHub's runner (not EAS's cloud
queue), but credentials are still fetched from EAS's credential service the
normal way — same keystore, zero signing risk, and it still avoids EAS's
cloud queue/compute, which was the actual original motivation.

**One manual step needed before it can run** (needs your account, so I
couldn't do this part):
1. Create an access token at
   `https://expo.dev/accounts/<account>/settings/access-tokens`
2. Add it as a GitHub repo secret named `EXPO_TOKEN` — either yourself via
   the GitHub UI, or hand me the token value and I'll set it with
   `gh secret set EXPO_TOKEN`.

Until that secret exists, triggering the workflow fails cleanly at the
build step with an auth error — nothing destructive either way. Once it's
set, trigger it from the Actions tab (`workflow_dispatch`, pick a profile)
and I can read the run logs and iterate if anything's off.
