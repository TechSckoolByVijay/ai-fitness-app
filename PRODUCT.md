# Product

## Vision

A voice-first personal health companion. The primary loop:

> User opens the app → taps a highly visible microphone button → speaks
> naturally → the app converts that into structured food/health data →
> calculates relevant metrics → updates the dashboard.

> "I had two rotis, dal and salad." → "Logged lunch — estimated 460 kcal and
> 19g protein." → dashboard updates automatically.

## Principles this build follows

1. **Voice first** — the mic button is the largest, most prominent element
   on Home; manual entry is a secondary path through the same text field.
2. **Minimal friction** — no food-database navigation for normal logging.
3. **Structured data underneath natural language** — every logged item is a
   typed `FoodItem` + `NutritionRecord` row, not free text.
4. **LLM for interpretation, not the source of nutritional truth** — the AI
   provider only identifies *what* was eaten or done; a separate
   `NutritionService` supplies calorie/macro numbers for food, and a
   deterministic MET-based formula (never the LLM) computes calories burned
   for a logged activity. See ARCHITECTURE.md's "Activity logging" section.
5. **Nutrition estimates are clearly marked as estimates** — `isEstimate: true`
   on every `NutritionRecord`, "Estimated calories" in the UI copy.
6. **Never overwhelm the user** — Home shows calories, protein, and today's
   meals; progressive disclosure for everything else.
7. **Health recommendations are conservative and safety-aware** — the
   calorie-target calculator floors at 1200 kcal/day regardless of inputs; the
   health-considerations onboarding step explicitly states the app does not
   diagnose or modify medication.
8. **Every AI action is editable** — every interpreted meal can be edited
   (quantity, items) before or after it's logged.
9. **Do not overbuild the first version** — this build is scoped to Phase 1
   of the spec's own phased plan; see below.

## Phase 1 scope (this build)

Per the spec's own "Implementation Priority" (section 47) and "Final
Acceptance Criteria" (section 50), this build delivers a complete, working
vertical slice:

**Register → onboard → Home → tap mic → "I ate a banana." → see it
interpreted with estimated calories/macros → confirm → see it in Today's
Meals → see daily calories update → log a complex multi-item meal by voice →
edit a misinterpreted meal → log via the food history screen → run the whole
thing in mock mode with zero external API credentials.**

Concretely: authentication, the full 6-step onboarding flow with progressive
target calculation, the Home dashboard, natural-language food logging (voice
UI with a mock-mode text fallback, or direct manual text entry — see
ARCHITECTURE.md for why these share one pipeline), AI interpretation with
three-tier confidence handling, nutrition estimation, and food history with
edit/delete/duplicate. Phase 2 (water/weight/sleep logging, see below) has
also since been built, so the Progress tab is a real screen, not a
placeholder.

### Deviation: activity logging and the AI Coach were pulled forward

Two pieces of spec-later-phase functionality were explicitly requested and
built into this Phase 1 codebase, ahead of the spec's own phasing:

- **Universal voice logging** (spec section 16, "Voice Beyond Food"): the same
  logging screen now also understands activity/exercise utterances ("I played
  badminton for 30 minutes", "I walked 1000 steps"), not just food. Calories
  burned are **always computed by a deterministic MET-based formula**, never
  by the LLM — the AI provider only extracts the activity type, duration,
  steps, or distance. See ARCHITECTURE.md's "Activity logging" section.
- **AI Coach** (spec sections 22-25, originally Phase 3): a real chat screen
  where the user can ask for a meal/snack suggestion given their remaining
  calorie budget, diet type, allergies, and recent eating history, and follow
  up asking for a step-by-step recipe. `AiConversation`/`AiMessage` (schema
  existed as Phase 2-4 scaffolding) are now fully wired. See
  ARCHITECTURE.md's "Coach" section.

Everything else in the "deliberately deferred" table below is still deferred.

### Phase 2: water, weight, and sleep logging, plus reminder preferences

Built as the natural next phase after Phase 1 (not a "pulled forward" deviation — this is spec sections 17-19 in their own sequence): quick water logging from Home (quantity quick-add against a computed daily target), a weight log with trend history that **feeds back into the calorie/protein/water target calculation** (logging a new current weight recalculates targets the same way onboarding does, not just once), and a sleep log (bedtime + wake time in, duration always computed server-side — never trusted from the client, same principle as the calorie-burn engine). Reminder *preferences* (per-category enable + preferred time) are implemented and persisted; actual push notification delivery is not — see the deferred table below.

## What's deliberately deferred (and why)

| Deferred | Spec section | Why |
|---|---|---|
| Google Sign-In | 3, 7 | Requires an Expo Dev Build + Google Cloud OAuth app; no acceptance criterion needs it beyond "create an account," which email/password satisfies. Schema (`authProvider`, `googleId`) is ready. |
| Push notification delivery for reminders | 19 | `NotificationPreference` CRUD (enable/disable per category, preferred time) is implemented and used by the Profile screen's Reminders card — see the Phase 2 note above. Actually *sending* a scheduled notification at that time (local `expo-notifications` scheduling or a server-side push) is not built yet. |
| Diet plans, structured personalized recommendations beyond chat | 22-25 | Spec's own Phase 3. The conversational AI Coach itself (ask for a suggestion, get a recipe) **was pulled forward and is implemented** — see the deviation note above. Structured multi-day diet plans are not. |
| Android Health Connect / wearables | 20, 21 | Spec's own Phase 4. `HealthDataProvider` interface + mock exist; no route calls it yet, so Home's steps/sleep fields show as not-connected rather than fabricated data. |
| Personal food memory via `FrequentMeal`/`FavoriteFood` tables | 28 | Those specific tables are still unused. The Coach's "frequently eaten foods" signal is instead computed directly from recent `FoodEntry` rows (see `coach-context.service.ts`) rather than a dedicated learned-preferences table. "My usual breakfast" as a *food-logging* shortcut still resolves to a low-confidence clarification prompt. |
| Real Speech/Nutrition providers | 3, 44 | No Whisper/USDA credentials were available to build/test against. Real AI interpretation (OpenAI, gpt-4o-mini) is implemented — see README's "AI configuration". Both remaining providers have documented interface + stub; flipping `MOCK_*=false` plus an API key is the intended integration point. |
| Structured manual food-entry form | 7 (item 8) | "Manual entry" is implemented as typing into the same NL interpretation pipeline rather than a separate item-by-item form with its own nutrition lookup — see ARCHITECTURE.md. This still satisfies the acceptance criteria (log without speaking) without a second, largely-duplicate code path. |

## Acceptance criteria checklist (spec section 50)

1. Create an account — ✅ email/password registration
2. Complete onboarding — ✅ 6 steps
3. Set a health/fitness goal — ✅
4. Set dietary preferences — ✅
5. Open Home — ✅
6. Tap the microphone — ✅
7. Say "I ate a banana." — ✅ (typed or mock quick-phrase in this build; see mic UX note in ARCHITECTURE.md)
8. See the interpreted food — ✅
9. See estimated calories/macros — ✅
10. Confirm it — ✅
11. See it appear in today's meals — ✅
12. See daily calories update — ✅
13. Log a complex meal using natural language — ✅ (verified: 3-item chapati/curry/salad sentence)
14. Edit an incorrectly interpreted meal — ✅
15. Log water — ✅
16. Log weight — ✅ (also recalculates calorie/protein/water targets from the new weight)
17. Configure reminders — ✅ preferences (enable + preferred time per category); actual notification delivery not yet built — see deferred table
18. View progress — deferred (Phase 2, placeholder screen exists)
19. Ask the AI Coach a question — ✅ (pulled forward from Phase 3 — see deviation note above)
20. Receive a response based on stored data — ✅ (grounded in calorie budget, diet type, allergies, and recent meal history — never fabricated by the LLM; see ARCHITECTURE.md's "Coach" section)
21. Run in mock mode without external credentials — ✅

Also verified beyond the spec's original section-50 list, per the explicit
activity-logging request:

22. Log a non-food activity by voice/text ("I played badminton for 30
    minutes", "I walked 1000 steps") — ✅
23. Calories burned are computed deterministically (never by the LLM) and
    widen the day's remaining eating budget — ✅
24. Ask the Coach for a dish suggestion honoring diet type + allergies +
    remaining budget, then follow up asking for the recipe — ✅
