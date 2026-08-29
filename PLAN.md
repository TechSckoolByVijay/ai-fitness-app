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

## Azure deployment — LIVE

Deployed to production in the `fitness-app` resource group (subscription
`d52d8c18-504a-45e8-8997-9c004316124c`, "Visual Studio Enterprise
Subscription", region **centralus** — see below for why not eastus).

**Live URL**: `https://fitness-coach-api.livelysand-91f7619e.centralus.azurecontainerapps.io`
(`/health` and `/docs` both confirmed 200; a real user register-through-the-
public-URL round trip confirmed the full path — API → production Postgres
— works end to end). Database migrations applied via `az containerapp exec`
(couldn't reach Postgres directly from a local machine — deliberate, the
firewall only allows Azure-internal traffic).

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

**Validated locally, end-to-end, before anything touched Azure**: built the
image (`docker build -f apps/api/Dockerfile .`), ran it against the local
Postgres via `host.docker.internal`, registered a real user through it
(confirms Prisma/DB connectivity from inside the container), and hit
`/docs`. All passed — this is what made it possible to diagnose the later
Azure-side issues with confidence that the image/app itself was never the
problem.

**More real issues hit during the actual deployment** (beyond the 4 already
listed above, all found and fixed live):
5. **PostgreSQL Flexible Server provisioning is restricted for this
   subscription in `eastus`** (and `eastus2`/`westus2`/`southcentralus`) —
   `"Provisioning is restricted in this region"`. Not a template bug;
   `centralus`/`westus3`/`northeurope` all work. Had already created the
   Container Apps environment + Log Analytics workspace in eastus before
   hitting this — deleted both and redeployed everything in `centralus` for
   consistency (lower latency between the app and its own database).
6. **Container Registry**: originally planned GHCR (free), but the `gh` CLI
   token here only has `gist`/`read:org`/`repo`/`workflow` scopes — no
   package-registry access, and nothing was pushed to GitHub yet anyway.
   Switched to **Azure Container Registry** (`fitnesscoachacr`, Basic tier,
   ~$5/mo) instead — lets the Container App pull via system-assigned
   managed identity with **no stored registry password at all**, which is
   also more secure than the GHCR-password approach originally planned.
7. **`az acr build` hung indefinitely** — uploaded nothing, no build run
   ever registered server-side, even after 18+ minutes on a ~34MB context.
   Killed it; used the path already proven locally instead — `docker build`
   (fast, already validated) + `az acr login` (uses the same working `az`
   session) + `docker push`. Confirmed via `az acr repository list`.
8. **Bicep chicken-and-egg deadlock**: the Container App's own provisioning
   blocks on successfully pulling its image, but the `AcrPull` role
   assignment for its managed identity — which is *required* for that pull
   — only gets created by Bicep *after* the Container App resource reaches
   a terminal state. Single-template deployment can't resolve this on its
   own. Fixed live by granting the role directly via the ARM REST API
   (`az rest --method put .../roleAssignments/<guid>`) using the identity's
   `principalId`, read straight off the half-provisioned resource — this
   also dodged a separate `az role assignment create`/`list --scope` CLI
   bug (`MissingSubscription` error) that affects this environment
   specifically (`az role definition list` and other `az` commands work
   fine; only role-*assignment* commands hit it). **`infra/main.bicep`
   still has the original single-template role assignment** — fine for
   reference, but a from-scratch redeploy will hit this same deadlock
   again; the real fix would be splitting the role assignment into a
   second deployment step, not yet done.
9. **A stuck server-side ARM operation** (not a client-side hang — killing
   the local `az` process didn't clear it) left the Container App's
   `provisioningState` on `InProgress` for ~40+ minutes, during which the
   public URL 404'd ("stopped or does not exist") even though the
   revision underneath was already `active`/`Healthy`/`Provisioned` —
   ingress apparently won't route until the resource-level state goes
   terminal. No CLI trick forced it faster; waiting it out and retriggering
   with `az containerapp update` once it finally flipped to `Failed` (a
   terminal state, unlike the never-ending `InProgress`) is what actually
   unblocked it.

**CI/CD**: `.github/workflows/deploy-api.yml` now builds via `az acr build`
(remote, in Azure — untested end-to-end given issue #7 above, worth
watching the first real run) and `az containerapp update`s to the new
image. Needs one GitHub secret once created: `AZURE_CREDENTIALS` (a service
principal — not yet created).

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

## Whole-day / multi-meal logging

User feedback: logging couldn't handle "breakfast was X, lunch was Y, and I
went for a walk" in one message — the pipeline only ever interpreted the
first extracted event, and the AI prompt explicitly told the model to force
everything into one event. Fixed at the source: `HealthExtractionResult`
already supported an array of heterogeneous food/exercise events (the
schema was never the limitation), so this was a prompt-and-pipeline fix,
not a redesign.
- `event.service.ts`'s `interpretHealthEvent` → `interpretHealthEvents`,
  returns `InterpretedHealthEvent[]` (always an array, single-element for
  the common one-meal case — no singular/plural special-casing for callers).
- OpenAI prompt now explicitly recognizes meal-time boundaries (breakfast/
  lunch/dinner/named times) as separate-event signals, and infers a
  sensible clock time per named meal (~8am/1pm/8pm) instead of stamping
  every event with the current time — otherwise multiple meals logged
  after the fact would all land on the same timestamp.
- **Live-verified against the real API**, not just mocked: "This morning I
  had a glass of milk and a banana, for lunch three chapatis and rice, and
  I went for a 20 minute walk in the evening" correctly produced 3 separate
  events with sensible per-meal timestamps and real USDA nutrition values.
- Mobile: `log-meal.tsx` rewritten to render a list of cards instead of
  one — each with its own confirm/edit exactly as before, plus a "Confirm
  all" shortcut and a per-card remove-from-batch control, shown only when
  there's genuinely more than one event (the single-meal case looks
  identical to before, no new UI chrome). Water mentioned in a whole-day
  utterance is NOT parsed — water logging stays on the dedicated Home card;
  extending voice extraction to a third event type was more scope than this
  pass needed.

## Voice input no longer auto-submits

User feedback: after speaking, the app submitted almost immediately (~1-2s
silence detection) with no chance to review or keep talking. Fixed by
decoupling "voice recognition finalized" from "submit to the API" — a
finalized voice segment now just appends to the text field (never
replaces it, so re-recording via a new "🎙️ Add more" button builds on
what's already there) and the user must explicitly tap "✓ Confirm & log".
This composes naturally with whole-day logging above — describe breakfast,
tap Add more, describe lunch, then confirm once.

## Calorie pacing indicator ("don't just show 0/2020, use what we know")

User feedback: showing "0 / 2020 kcal" early in the day looks alarming/
uninformative, and the app already has enough data (height/weight/activity)
to say more than that. Added a pacing indicator to the Home calorie card
rather than a new raw number — a marker line on the existing progress bar
showing "where you'd typically be by this time of day" (prorated across a
fixed 7am-10pm eating window, not a real per-user pattern — deliberately
not claiming more precision than that), plus a short factual sentence
("180 kcal under pace — nice, that's building today's deficit").

Goal-aware using the exact same judgment as the backend's yesterday insight
card: a deficit is favorable for `lose_weight`, a surplus is favorable for
`gain_muscle`. Rather than duplicate that logic, `classifyCalorieDirection`
moved out of `insights-logic.ts` into `packages/shared/src/utils/
calorie-alignment.ts` as `classifyCalorieAlignment` — now the single
canonical implementation both the backend (yesterday, server-side) and
mobile (right now, client-side, since "now" is inherently a device-local
concept) import, instead of two copies that could drift.

## Known follow-ups (not yet done)

- `infra/main.bicep`'s role assignment will hit the same chicken-and-egg
  deadlock (issue #8 above) on any from-scratch redeploy — worth splitting
  into a second deployment step before relying on the template again.
- Postgres firewall currently allows all Azure-internal traffic
  ("AllowAzureServices"), not scoped to just this Container App — fine at
  this scale, worth tightening with VNet integration if it grows.
- **Git Bash + `az` gotcha worth remembering**: any bare `/subscriptions/...`
  argument (`--scope`, `--scopes`, `--ids`) gets silently mangled into a
  literal Windows path by Git Bash's auto path-conversion, producing a
  baffling `(MissingSubscription)` error that looks like an Azure-side
  problem but isn't. Prefix the command with `MSYS_NO_PATHCONV=1`, or use a
  full `https://management.azure.com/...` URL via `az rest` instead — this
  wasted significant time before being root-caused.

## Overnight autonomous session (2026-08-27) — photo logging, insights, health-safety hardening, legal pages

User went to sleep and gave explicit standing authorization to build, test,
and deploy without supervision until morning ("it's okay if it breaks
because I know there's no one else using this application"). Everything
below was built, tested, and pushed live during that window. Google
Sign-In and the actual Play Store submission were explicitly NOT touched —
user wants to be present for both.

**Photo-based meal logging** (the flagship ask). Two things decided against
mid-plan, both worth remembering:
- **Not Azure Document Intelligence** — user has free MCT credits for it,
  but it's an OCR/document-structure service, not a vision/scene-recognition
  one; it cannot look at a plate of food and identify what's on it. User
  agreed to skip it and use OpenAI's vision model for everything instead.
- Implementation reused the *entire* existing text-interpretation pipeline
  rather than building a parallel one: `FoodInterpretRequestSchema` gained
  an optional `imageBase64` field, `AIProvider.extractHealthEvents` now
  takes `text?`/`imageBase64?` instead of a required `text`, and
  `OpenAIProvider` builds a multimodal Responses-API message (image + a
  photo-specific instruction appended to the same system prompt) when an
  image is present. Everything downstream — confidence tiers, nutrition
  lookup, the calorie slider, confirm/edit — needed zero changes.
- Mock provider returns an honest "meal from photo" placeholder (medium
  confidence) rather than pretending to recognize something — mock mode
  still exercises the full confirm flow without faking vision capability.
- **Live-verified against the real OpenAI API** (not just mocked): a
  non-food test image correctly came back as "unclear photo" (low
  confidence, triggers the clarifying-question flow) rather than a
  hallucinated dish — confirms the "never fabricate what you can't see"
  instruction in the prompt is actually being honored, not just written.
- Mobile: new camera button next to the mic button on Home
  (`VoiceButton.tsx`). Picking/taking a photo hands the base64 image to
  `log-meal.tsx` via a tiny Zustand store (`pendingPhoto.ts`) rather than a
  navigation param — a photo is far too large for that. `log-meal.tsx`
  checks for a pending photo on mount and skips straight to processing
  instead of auto-starting voice; error/retry states were adjusted so
  "Try again" retries the same photo instead of assuming there's text to
  retry with. New dependency: `expo-image-picker` — this is what forced a
  native rebuild (see below); no other feature tonight needed one.
- **Not independently verified end-to-end on a real device** — no camera
  access in this environment. The backend half is proven against the real
  API; the mobile picker/upload flow is typechecked and follows established
  patterns exactly, but genuinely needs a real first test once the new
  build is installed. First thing worth trying in the morning.

**Coach + insights hardened for Google Play's health-app review**, prompted
directly by the user relaying Play's actual review criteria for AI health
content mid-session:
- The Coach's `CoachContextInput` never included the user's onboarding-
  reported health conditions at all — a real gap, now fixed
  (`coach-context.service.ts` fetches them; system prompt factors them into
  tone/caution without diagnosing).
- System prompt gained an explicit wellness-not-medical boundary: no
  diagnosing, no prescribing supplements/dosages, no condition-specific
  exercise prescriptions — general lifestyle framing only, with a redirect
  to a healthcare provider for anything beyond that. Matches the exact
  "DO/AVOID" framing the user relayed from Play's own guidance.
  Permanent, visible disclaimer added to the Coach screen.
- The new **rule-based insight cards** (below) were designed with the same
  boundary from the start — pure arithmetic/template language, tested to
  assert no diagnostic or prescriptive wording ever appears.

**Goal-aware daily insight cards** — the "yesterday you were in a calorie
deficit, that's good progress" feature. Rule-based only (no AI, no
diagnostic risk, free-tier-safe): `GET /insights/today` returns up to two
cards — yesterday's result framed relative to the user's *actual* goal
direction (`classifyCalorieDirection()` — a deficit is progress for
`lose_weight` but a setback for `gain_muscle`, favorable-within-tolerance
for everything else), and a streak card for consecutive favorable days.
20 unit tests on the pure logic, 4 integration tests on the route/DB
wiring. Rendered on Home right below the greeting, above the raw numbers —
motivational framing first, data underneath, matching the "don't bombard
with data, surface the story" direction the user gave.

**Privacy Policy + Terms of Service**, served live at `/legal/privacy` and
`/legal/terms` on the API's own domain — no separate hosting needed, and
it's a real Play Console submission requirement (Data Safety / Health Apps
declaration both need a live URL). Written to reflect what the app actually
does and who data actually goes to (OpenAI, USDA, Azure) — not a generic
template — but worth a personal read-through before an actual submission.

**Everything is backend-deployed and live already** (pushed to `main`
in stages throughout the night; each push auto-deployed via the now-proven
CI/CD pipeline, verified live after each one — health checks and API
version confirmed at each step, not just "the pipeline said success").
The **one exception** is the photo-logging mobile UI and the insight cards'
mobile UI, which need the native rebuild triggered for `expo-image-picker`
(app.json bumped 1.0.2 → 1.0.3) — that build was queued before this summary
was written; check `eas build:list` for its status. **Install the new APK
to get everything from tonight** — it bundles all of tonight's JS changes
as its embedded bundle, so no separate OTA step is needed after installing
it.

## Mobile app pointed at production

`EXPO_PUBLIC_API_URL` updated to the live Azure URL in two places: EAS's
hosted preview environment variable (what `eas update` actually reads —
`eas.json`'s own `env` block only applies to `eas build`) and `eas.json`
itself (so a future native rebuild also gets it right). Shipped via OTA
update — no rebuild needed, pure config change. The installed app will
pick it up after being fully closed and reopened twice (standard
`expo-updates` behavior). The ngrok tunnel + local API server are no
longer needed for the phone to work, though still useful for local dev
against a non-production database.

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

## Reminder deep-link, onboarding tour, meal-type insight (2026-08-27, continued)

Closing out the remaining items from the earlier user-feedback list
(onboarding guidance, notification-tap prompt, meal-type-aware insights),
after the whole-day logging / voice-confirm / calorie-pacing batch above
shipped successfully (both OTA and backend deploy verified green).

**Notification-tap deep link.** Tapping the meal-logging reminder used to
just open the app to Home like any other launch — no different from not
tapping a notification at all. Added a root-level listener
(`useNotificationTapRouting` in `app/_layout.tsx`) using
`addNotificationResponseReceivedListener` (warm-app taps) and
`getLastNotificationResponseAsync` (cold-start taps, checked once on mount)
that routes straight to `log-meal` when the tapped notification's
`data.category` is `goal_progress`. The scheduled notification content
gained `data: { category }` (`lib/notifications.ts`) so the tap handler can
tell which reminder was tapped. Landing on `log-meal` already auto-starts
voice listening with example phrases as quick-pick chips, which covers the
"give an example" half of the ask without any extra UI.

**Onboarding tour.** New users had no walkthrough of what the app actually
does day to day. Added a 7th onboarding step (`app/(onboarding)/tour.tsx`,
after health conditions, before landing on Home) — a single static screen
listing four things worth knowing (voice logging, whole-day batch logging,
the Home progress view, reminders), not a swipeable carousel. Chose a
static list deliberately: a swipe gesture is one more thing to figure out
for a non-technical audience, and the app's own philosophy (per the user's
own instruction) is to keep things simple and not bombard with UI. Bumped
`OnboardingScaffold`'s `TOTAL_STEPS` 6 → 7 and `health.tsx`'s finish
handler now routes to `/tour` instead of `/` directly.

**Meal-type-aware insight.** `mealType` was already stored per food entry
but insights never used it. Added `buildMealProteinCard` (
`insights-logic.ts`) comparing average daily protein across
breakfast/lunch/dinner (snacks excluded — too unstructured to compare
fairly) over the trailing 7 days, e.g. "You're getting more protein at
lunch (~45g) than dinner (~15g). Try adding a protein source to dinner."
Deliberately conservative: needs at least 3 distinct logged days per meal
type before comparing at all, and the gap has to be both ≥8g absolute and
≥35% of the stronger meal — otherwise it stays quiet rather than reacting
to one noisy day. `insights.service.ts` computes per-meal-type daily
protein via one `foodEntry.findMany` query grouped in memory (day × meal
type → summed protein, then averaged across days) rather than a second
per-meal SQL aggregation, since the entry count here is small enough that
in-memory grouping is simpler and plenty fast.

**Manual exercise entry** (another item from the same feedback list) turned
out to need no new work — the existing `log-meal.tsx` text field already
accepts typed (not just spoken) exercise phrases like "I did 30 min of
weightlifting," and the AI pipeline already classifies it as an exercise
event via the same multi-event pipeline used for food. No dedicated form
was built, consistent with the app's voice/text-first design rather than
adding a second parallel entry path.

All three changes typechecked and passed their test suites (mobile: 41
Jest tests; API: 172 Vitest tests, including a new integration test that
logs 3 days of high/low-protein lunch/dinner entries and confirms the card
appears). The reminder + tour changes are JS-only and shipped via `eas
update` (no native dependency, no rebuild needed); the insights change
shipped via the normal GitHub Actions → Azure Container Apps pipeline.

## Full visual revamp (2026-08-28) — "make it exciting, not a research tool"

User feedback (with competitor screenshots as the reference): the app felt
dull and clinical — small fonts, flat white-on-white, no color, features
like the calorie slider going unnoticed. Revamped the entire visual system
in one pass, OTA-shippable (no new native deps — deliberately avoided
react-native-svg rings since that would force a rebuild + reinstall):

- **Tokens** (`tailwind.config.js`): vivid green primary (#12c06e family),
  soft gray-green page background (`surface.light #f2f5f3`) so white cards
  visibly float; hardcoded old-green hexes swept app-wide.
- **Type scale up** (`Text.tsx`): title 30px extrabold, subtitle xl bold,
  body 16, caption 14 semibold; new `display` variant for hero numbers.
- **Cards** rounded-3xl with soft shadow; **buttons** are full pills,
  56px, bold 17px; **chips** are tinted green pills (solid when selected).
- **Home**: greeting + motivational subline; NEW `WeekStrip` (7 date
  bubbles, logged days filled green with ✓, today ringed dark) + 🔥
  logging-streak row (`computeLoggingStreak`, client-side from the existing
  `/dashboard/history?days=30` — a *logging* streak, deliberately the
  easiest streak to keep, since the habit being rewarded is showing up);
  hero calorie card is now a fully saturated green panel with a 60px white
  number and thick white pace bar; protein (sky) + burned (amber) tinted
  duo cards; water card sky-tinted with big quick-add pills.
- **Tab bar**: filled icons when active, bold labels.
- **Coach**: header with "Clear chat" (new `DELETE /coach/conversation`
  backend route + integration tests — messages cascade-delete, next
  message starts fresh); bubbles restyled (user solid green, assistant
  white card, asymmetric corners).
- **Calorie slider** now sits in its own tinted "🎚️ Slide to fix
  calories" panel — it existed before but users weren't finding it.
- **Insight cards**: fully tinted tone panels (green/amber) instead of
  hairline left borders.

Not touched: navigation structure, onboarding flow order, log-meal state
machine — this pass is visual identity + retention mechanics only.

---

# CalorieQ free-tier parity

Goal: bring the app to at least feature parity with CalorieQ's free tier,
based on a screenshot walkthrough of that app (2026-08-29). Ordered by
value-per-unit-of-work, not by screen.

## 0. Status-signal colour system — DONE (2026-08-29)

Every status message rendered in brand green, so a warning was visually
identical to praise. Root causes were three separate places discarding the
signal:

- `app/(tabs)/index.tsx` hardcoded `bg-primary-500` and computed
  `caloriePace.alignment` without ever using it.
- `ProgressBar` clamped at 100%, so 500 kcal over target looked exactly like
  hitting it.
- The Tailwind theme had no semantic colours at all, so each component
  invented its own inline.

Fixed via `src/utils/statusTone.ts` as the single source of truth
(`positive` / `neutral` / `caution` / `critical`), `caution` + `danger`
colour scales, `ProgressBar` overflow rendering, and a tone-driven hero.
Resting state is now slate, not green — green is *earned*, otherwise it
can't mean anything. Every tone carries a distinct shape and word, not just
a colour (red/green is the most common colour-vision deficiency and is
precisely the distinction being drawn).

## 1. Vision model — food photo recognition

Not a missing feature: the pipeline (`mealPhoto.ts` → `/events` →
`openai.provider.ts` `PHOTO_INSTRUCTION`) already exists and already asks for
every distinct item with per-item portions. `chapati` is already in
`food-table.ts` with roti aliases.

The failure is model tier. `.env` has `AI_MODEL=gpt-4o-mini` — the weakest
vision tier. Actions:

- Move to a stronger vision model (env-var only, no code change).
- Raise `mealPhoto.ts` capture `quality` 0.5 → 0.7 and `detail` to `high`
  for food photos.
- Prime `PHOTO_INSTRUCTION` with Indian-cuisine vocabulary. CalorieQ returns
  "Whole Wheat Roti" — that specificity is a prompt bias, not a better model.
- Re-test with the original chapati photo before/after.

## 2. Reminders — selectable time + user-added reminders — DONE (2026-08-29)

Scoped down on 2026-08-29 after review. **Explicitly NOT doing** repeating
interval reminders ("water every 2 hours"): the existing fixed reminders are
fine as they are. The unused `NotificationPreference.frequency` column stays
unused.

Two things to fix:

### 2a. Time must be selected, not typed

`RemindersCard.tsx` currently asks the user to type "21:00" into a
`TextField` with a `numbers-and-punctuation` keyboard, validated by regex.
That is the worst interaction in the app.

- Add `@react-native-community/datetimepicker` (bundled in Expo Go, so no
  dev build needed — install with `npx expo install`).
- New `TimeField` UI component: renders the current time as a pressable
  chip, opens the native clock dialog on Android / spinner on iOS, hands
  back "HH:MM". One component, used by both built-in and added reminders,
  so the two can never diverge.
- The existing `preferredTime` regex on the API stays as the server-side
  guard — a picker can't emit a bad value, but the endpoint is still public.

### 2b. Let the user add their own reminders

Someone may want lunch only, or lunch and dinner. Today that is impossible:
`schema.prisma` has `@@unique([userId, category])`, so exactly one row can
exist per category.

The row already has an `id` primary key — the constraint is the only thing
in the way. Plan:

- **Migration**: drop `@@unique([userId, category])`; add `label String?`
  (null = one of the three built-ins, non-null = a user-added reminder).
- **Backfill**: insert the three built-in rows for every existing user, and
  seed them on registration for new ones. This is what makes every row
  addressable by `id`, so no endpoint has to fall back to addressing a
  not-yet-persisted row by category. Deliberately seeded at registration
  rather than lazily on first GET — a read endpoint should not write.
- **API** becomes id-keyed: `POST` to create, `PATCH /:id`, `DELETE /:id`.
  Built-in rows accept `PATCH` but refuse `DELETE`, so a user can turn the
  water reminder off but cannot end up with an app that has lost it.
- **Scheduling**: `notifications.ts` currently derives the OS notification
  identifier from the category (`reminder-${category}`), which means two
  reminders of the same kind would silently overwrite each other. Key it by
  row `id` instead. The cancel-before-reschedule reconciliation already
  works and stays as-is.
- **Copy**: `REMINDER_CONTENT` only has title/body for the three built-ins.
  A user-added reminder uses its own label as the notification title with a
  generic body.

### UI

One Reminders screen, matching the reference app's shape: built-in rows
first, then any added reminders, then an "Add reminder" button that asks for
a label and a time. Each row is a toggle plus a tappable time. Deleting an
added reminder is a swipe or a row action; built-ins have no delete
affordance at all rather than a disabled one.

### Implementation note: Prisma schema drift

The migration creates a **partial** unique index
(`... ON "NotificationPreference"("userId","category") WHERE "label" IS NULL`)
to keep the "at most one built-in per category per user" guarantee. Partial
indexes cannot be expressed in `schema.prisma`, so `prisma migrate dev` will
report drift and offer to drop it. Do not accept that: `createMany({
skipDuplicates: true })` in `seedBuiltInReminders` compiles to
`ON CONFLICT DO NOTHING`, which needs this index to detect a duplicate.
Use `prisma migrate deploy` (which does not diff) for deployments.

## 3. Unit system (metric / imperial) — DONE (2026-08-29)

Currently zero support — `grep` for `imperial|unitSystem|lbs` returns nothing.

- Keep storing metric in the DB; convert at the display layer only.
- `Profile.unitSystem` enum + migration; shared conversion helpers in
  `packages/shared`.
- Units settings screen (radio list).
- A lbs/kg toggle on the weight-logging sheet itself, so it is changeable in
  the moment rather than only in settings.
- Default metric, user-switchable.

## 4. Weight logging ruler slider — DONE (2026-08-29)

`app/log-weight.tsx` is a plain TextField. Replace with a horizontal
snap-to-tick ruler (big number above, drag left/right), per CalorieQ.

## 5. Calorie budget screen — DONE (2026-08-29)

New — we compute targets in `calorie-targets.ts` with no override path.

- Standard (calculated) vs Customizable (user-set) calorie target.
- Macro ratio sliders (carbs / fat / protein).
- Keep our own 1200 kcal floor (PRODUCT.md principle 7) rather than
  CalorieQ's 800 lower bound.

## 6. Onboarding slim-down — DONE (2026-08-29)

Currently 7 screens, with `body-info.tsx` asking 13 decisions on one screen
and `goal.tsx` offering 7 goals.

- Cut the goal step to three (lose / maintain / gain). Keep the other four
  `GoalType` enum values so nothing breaks — just stop showing them.
- Split body-info into one-question-per-screen steps.
- Replace the `YYYY-MM-DD` text field with a real date picker.
- Make allergies and health conditions skippable.

Sex and date of birth are already collected and already feed BMR/TDEE via
`calorie-targets.ts`, so age/sex-appropriate targets already work — this is
an input-UX problem only.

## 7. Weight progress card — DONE (2026-08-29)

`BmiCard` already matches CalorieQ's BMI scale closely. Missing is their
Weight Progress card: goal weight, projected reach date, and the trend line
chart. `LineChart` and `useWeightEntries` already exist.

## 8. Server-sent reminders — DONE (2026-08-29)

Local scheduling only survived on the device it was set on. The server now
owns delivery via Expo push, keyed on the device timezone that travels up
with the push token. Local scheduling remains as the fallback when push is
unavailable, and the two are either/or so nothing arrives twice.

## 9. Health Connect — DONE (2026-08-29)

The pre-existing `HealthDataProvider` interface was shaped as *the server
fetches health data*, which cannot work: Health Connect and HealthKit are
on-device APIs the server has no access to. Replaced with the correct shape
— the client reads the device and posts to `/health/sync`.

Steps and distance mirror into `DailySummary`; device sleep and active
calories deliberately do NOT, because the daily aggregation pass recomputes
those two from the user's logged entries and would silently overwrite them.
Those live in `HealthMetric` only, and logged entries stay authoritative.

Needs a dev/production build — the native module is absent in Expo Go, where
the card states that plainly rather than offering a button that does nothing.

## Deployment (2026-08-29)

All parity work plus push notifications and Health Connect deployed to Azure
Container Apps. Five migrations applied automatically at container start.

**Incident — API down ~25 minutes.** The first deploy crashed on boot:
`server.ts` registered the reminder scheduler's `onClose` hook *after*
`app.listen()`, which Fastify rejects outright
(`FST_ERR_INSTANCE_ALREADY_LISTENING`). Migrations had applied cleanly; only
the boot sequence was wrong.

The whole suite passed against code that could not start, because every
integration test uses `app.inject()` and never boots the HTTP server.
`test/integration/server-boot.test.ts` now calls `listen()` for real and
mirrors `server.ts`'s ordering — verified to fail with the exact production
error when the hook is moved back after listen.

Takeaway: `inject()`-only coverage cannot catch startup-ordering faults. Any
future change to `server.ts` should be reflected in the boot test.

## Rejected

**Home + navigation restyle (5 tabs -> 3 tabs + centre FAB).** Considered
after the CalorieQ walkthrough and explicitly declined on 2026-08-29 — the
current tab structure stays. Not revisiting without a new reason.
