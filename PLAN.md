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
| Nutrition estimation | ✅ | Mock macro table; real USDA provider not built (see Deferred) |
| Food history (edit/delete) | ✅ | |
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

## Known follow-ups (not yet done)

- None currently open.

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
| Real Nutrition provider (USDA FoodData Central etc.) | 3, 44 | Mock macro table only; interface + factory ready for a real implementation |
| Android Health Connect / wearables | 20, 21 | Interface + mock exist, no route wired |
| Structured multi-day diet plans | 22-25 | Conversational Coach is built; structured plans are not |
| Personal food memory (`FrequentMeal`/`FavoriteFood` tables) | 28 | Coach's "frequent foods" signal is computed ad hoc from `FoodEntry` instead |
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
- **Any UI/JS change needs a full rebuild + reinstall.** This is a
  standalone `buildType: apk` build (not a dev client) — the JS bundle is
  baked in at build time with no live Metro connection and no OTA update
  mechanism configured, so "just reopen the app" never picks up new code.
  (Backend-only changes obviously don't need this, since the app talks to
  the API over the network either way.)
- **Considering**: self-hosting the Android build via GitHub Actions instead
  of EAS Build's cloud service (free either way, but avoids EAS's queue and
  any card-on-file requirement) — means taking over keystore management and
  `expo prebuild` ourselves. Separately, worth adding EAS Update (or another
  OTA mechanism) so JS-only changes don't require a full native rebuild each
  time — that's what's been costing ~15-30 min per iteration this session.
  Neither started yet; revisit together before continuing this pattern much
  longer.
