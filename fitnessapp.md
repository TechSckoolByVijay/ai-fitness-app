
# Build a Production-Quality AI Fitness & Nutrition Coach App

You are a senior product engineer, UX designer, mobile architect, backend engineer, and AI application engineer.

I want you to design and build a **working personal AI fitness, nutrition, and lifestyle coach application**.

Do not merely create a prototype/mockup or explain how to build it. **Actually implement the application**, including the frontend, backend, database schema, AI interaction layer, authentication, voice-based food logging, reminders, health-data integration architecture, and a polished UX.

The application should be designed mobile-first, but the architecture should allow future expansion.

---

# 1. Product Vision

Build a **voice-first personal health companion**.

The primary interaction should be extremely simple:

> User opens the app → taps a highly visible microphone button → speaks naturally → the application understands what they said → converts it into structured health/food/activity data → calculates relevant metrics → updates the user's dashboard.

Example:

> "I ate a banana."

The system should recognize:

* food = banana
* quantity = 1
* approximate time = current time
* meal/event type = snack/food

Then calculate and record estimated:

* calories
* protein
* carbohydrates
* fat
* fiber

Another example:

> "At 12 o'clock I ate two medium chapatis, around 200 grams of less-oily medium-spicy curry, and a bowl of salad."

The system should understand the complete statement and convert it into structured food entries.

The user should NOT need to manually navigate through a complicated food database for normal food logging.

---

# 2. Core Product Principles

Follow these principles throughout the application:

1. **Voice first**
2. **Minimal friction**
3. **Progressive profiling**
4. **Personalization over time**
5. **Structured data underneath natural language**
6. **LLM for interpretation, not as the source of nutritional truth**
7. **Nutrition estimates should be clearly marked as estimates**
8. **Never overwhelm the user**
9. **The application should remember user preferences**
10. **Health recommendations must be conservative and safety-aware**
11. **Every important AI action should be explainable and editable**
12. **The application should feel like a personal coach, not a spreadsheet**

---

# 3. Recommended Technology

Use a modern, maintainable stack.

If the repository already has a stack, inspect it first and use the existing architecture where sensible.

Otherwise, prefer:

Frontend/mobile:

* React Native + Expo
* TypeScript
* Expo Router
* NativeWind or another clean styling system
* React Query/TanStack Query for server state

Backend:

* TypeScript
* Node.js
* Fastify or NestJS

Database:

* PostgreSQL
* Prisma ORM

Authentication:

* Google Sign-In
* Email/password or magic-link authentication
* Secure session/token handling

AI:

* OpenAI-compatible LLM abstraction
* Speech-to-text service abstraction
* Structured JSON/function calling for food/event extraction

Notifications:

* Expo Notifications or native notification infrastructure

Health:

* Android Health Connect integration
* Design the architecture so Apple HealthKit can be added later

Important:
Do not tightly couple business logic to one AI provider. Create an AI service abstraction.

---

# 4. First Step: Inspect Before Coding

Before writing implementation code:

1. Inspect the repository.
2. Determine whether an existing application exists.
3. Identify current framework, dependencies, conventions, and structure.
4. Identify what can be reused.
5. Identify missing infrastructure.
6. Create a concise implementation plan.

Then begin implementation.

Do NOT destroy existing functionality unless absolutely necessary.

---

# 5. Main Navigation

Use a simple bottom navigation:

1. Home
2. Food
3. Progress
4. Coach
5. Profile

The Home screen should contain the most prominent action in the application:

## Voice Button

A large microphone/voice button positioned in the lower portion of the screen.

Example:

> 🎙️
> Tell me what you ate

The button should be visually prominent but still elegant.

When tapped:

* Start recording
* Show recording animation
* Display live transcription where possible
* Allow user to stop recording
* Process speech
* Show interpretation
* Confirm/log the event

The voice interaction should feel fast and conversational.

---

# 6. Home Dashboard

The Home screen should answer:

> "How am I doing today?"

Display:

## Calories

Example:

1,240 / 2,100 kcal

## Protein

72 / 120 g

## Water

1.8 / 3.0 L

## Steps

6,420 / 8,000

## Sleep

7h 12m

## Today's Meals

Example:

8:00 AM
Banana

12:00 PM
2 chapatis + curry + salad

3:30 PM
Tea

7:45 PM
Dinner

The dashboard should be visually clean.

Do not display 20 metrics simultaneously.

Use progressive disclosure for detailed information.

---

# 7. User Onboarding

Do NOT ask the user 50 questions at registration.

Use a short onboarding flow followed by progressive profiling.

## Step 1 — Account

Ask:

* Name
* Email
* Google Sign-In
* Optional profile photo

## Step 2 — Basic Body Information

Ask:

* Age/date of birth
* Height
* Current weight
* Target weight
* Sex, where needed for calculations

## Step 3 — Primary Goal

Provide attractive cards:

* Lose weight
* Gain muscle
* Maintain weight
* Improve fitness
* Improve overall health
* Improve sleep
* Build healthier eating habits

Allow:

* Primary goal
* Optional secondary goals

## Step 4 — Diet Preference

Options:

* Vegetarian
* Eggetarian
* Non-vegetarian
* Vegan
* Other

## Step 5 — Allergies / Intolerances

Allow selecting:

* Milk
* Lactose
* Curd
* Gluten
* Nuts
* Peanuts
* Eggs
* Seafood
* Other

Allow free-text additions.

## Step 6 — Health Considerations

Ask:

> "Is there anything about your health that we should consider when giving recommendations?"

Optional selections:

* Diabetes
* Blood pressure
* Cholesterol
* Thyroid
* Kidney-related dietary restrictions
* Digestive conditions
* Current medications
* Other

Include:

> Prefer not to answer

Do not make this screen intimidating.

Clearly explain that health information is optional and used for personalization/safety.

Do not allow the AI to prescribe, stop, or modify medications.

---

# 8. Progressive Profiling

After onboarding, the application should gradually learn more about the user.

Do not ask all questions at once.

Examples:

Day 1:
"What time do you usually wake up?"

Day 2:
"Do you usually drink tea or coffee?"

Day 3:
"How many meals do you normally have?"

Day 5:
"How often do you eat outside?"

Day 7:
"Do you prefer rice or chapati?"

The user can always choose:

Skip

The system should track which profile fields are known/unknown.

Create a `profile_completion` concept.

Do not repeatedly ask questions whose answers are already known.

---

# 9. Natural Language Food Logging

The application must support natural speech.

Examples:

"I ate a banana."

"I had two bananas."

"I ate two medium chapatis."

"I had 200 grams of dal."

"I ate about 200 grams of less oily paneer curry."

"I had two rotis and one bowl of salad."

"I ate lunch at 1:30."

"I had tea with two teaspoons of sugar."

"I ate the same breakfast as yesterday."

The system should extract structured information.

For each food item identify:

* Food name
* Quantity
* Unit
* Approximate weight if inferable
* Preparation method
* Ingredients if known
* Meal type
* Timestamp
* Confidence
* User-provided descriptors

---

# 10. Food Interpretation Pipeline

Implement this architecture:

Voice
↓
Speech-to-text
↓
LLM structured extraction
↓
Food normalization
↓
Nutrition database lookup
↓
Nutrition calculation
↓
User confirmation when necessary
↓
Persist structured meal
↓
Update daily totals

The LLM should NOT invent nutritional facts whenever a reliable nutrition database can provide them.

Create an abstraction:

`NutritionService`

which can later connect to:

* USDA FoodData Central
* Open Food Facts
* Indian nutrition datasets
* Custom food database

Design the system so multiple nutrition sources can coexist.

---

# 11. Confidence System

Implement confidence-aware behavior.

### High confidence

Example:

"I ate one banana."

→ Log automatically.

### Medium confidence

Example:

"I had a bowl of curry."

→ Make a reasonable estimate but show:

> Estimated meal — tap to edit

### Low confidence

Example:

"I had some curry."

→ Ask:

> What type of curry?

Offer quick options.

The system should never silently make a highly consequential assumption.

---

# 12. Nutrition Calculations

Track:

* Calories
* Protein
* Carbohydrates
* Fat
* Fiber
* Sugar
* Sodium where available

All values should be estimates unless directly measured.

Display:

> Estimated calories

rather than pretending the value is exact.

Allow users to edit:

* Food
* Quantity
* Serving size
* Preparation
* Ingredients

Store corrections so they can improve future personalization.

---

# 13. User Health Model

Create a structured user profile.

Suggested model:

User

* id
* name
* email
* dateOfBirth
* sex
* height
* currentWeight
* targetWeight
* activityLevel
* primaryGoal
* secondaryGoals
* dietType
* allergies
* intolerances
* dislikedFoods
* healthConditions
* medications
* wakeTime
* targetSleepTime
* waterTarget
* calorieTarget
* proteinTarget
* notificationPreferences

Do not put all of this into one unstructured JSON field.

Use structured tables where appropriate.

---

# 14. Daily Health State

Create a daily aggregation model.

For each date:

* caloriesConsumed
* proteinConsumed
* carbsConsumed
* fatConsumed
* fiberConsumed
* waterConsumed
* steps
* distance
* activeCalories
* sleepDuration
* exerciseDuration
* weight
* screenBreakCompliance

The daily state should be derived from underlying events wherever practical.

---

# 15. Event-Based Data Model

Prefer storing source events rather than only daily totals.

Examples:

FoodEvent
WaterEvent
ExerciseEvent
WeightEvent
SleepEvent
HealthMetricEvent
ScreenBreakEvent

This will allow:

* recalculation
* corrections
* historical analysis
* improved AI personalization

---

# 16. Voice Beyond Food

The microphone should eventually become a universal health logging interface.

Examples:

"I drank 500 ml water."

→ WaterEvent

"I walked for 30 minutes."

→ ExerciseEvent

"I slept at 11:30 and woke up at 6:30."

→ SleepEvent

"I weighed 82.4 kilos."

→ WeightEvent

"I had two cups of tea."

→ FoodEvent

"I skipped breakfast."

→ MealEvent

Design the event extraction layer so adding new event types is easy.

---

# 17. Water Tracking

Allow user-specific water goals.

Example:

3.0 L/day

Show:

1.8 / 3.0 L

Allow logging through:

* Voice
* Quick-add buttons
* Manual entry

Quick-add:

+250 ml
+500 ml
+750 ml

Allow customizable reminders:

* Off
* Every 30 min
* Every 60 min
* Every 90 min
* Custom

Do not aggressively remind users if they are already meeting the goal.

---

# 18. Sleep Tracking

Allow the user to define:

* Target bedtime
* Target wake time
* Target sleep duration

Support manual logging initially.

Later support wearable/health integrations.

Create smart notifications:

1 hour before target bedtime:

> Wind-down time 🌙

15 minutes before:

> Your target bedtime is in 15 minutes.

Do not send excessive notifications.

---

# 19. Screen/Eye Break Reminder

Implement configurable break reminders.

Defaults:

20 minutes

Allow:

* 20 min
* 30 min
* 45 min
* Custom
* Off

Notification:

> 👀 Time for a screen break.
> Look away from the screen for a moment.

Track whether the user acknowledges the break.

---

# 20. Health Data Integration

Implement an abstraction layer:

`HealthDataProvider`

Methods such as:

* getSteps()
* getSleep()
* getHeartRate()
* getActiveCalories()
* getDistance()
* getWeight()
* getWorkouts()

Initially support Android Health Connect where feasible.

Architect the system so Apple HealthKit can be added later.

Do not tightly couple the application's domain model to Google-specific APIs.

---

# 21. Activity Data

Import:

* Steps
* Distance
* Active calories
* Exercise/workouts
* Heart rate where available
* Sleep

Display activity on Home.

Example:

7,420 steps
82% of goal

The AI coach should be able to use activity data when making suggestions.

---

# 22. AI Coach

Create a dedicated Coach screen.

The user can ask:

"What should I eat for dinner?"

"How am I doing today?"

"Why am I not losing weight?"

"What should I eat tomorrow?"

"Give me a vegetarian high-protein dinner."

"How many calories can I eat tonight?"

"What did I eat yesterday?"

"How much protein did I get this week?"

The AI should have access to the user's relevant structured context.

Do NOT send the entire database blindly into every LLM request.

Create a context-building service.

Example:

`CoachContextService`

which selectively retrieves:

* user profile
* goals
* today's nutrition
* recent meals
* recent weight trend
* recent activity
* sleep trend
* relevant preferences

---

# 23. AI Safety

The system must NOT:

* Diagnose diseases
* Prescribe medication
* Recommend stopping medication
* Change medication dosage
* Make definitive medical claims
* Present nutritional estimates as medically precise

When appropriate:

> "This is general wellness information. For medication or medical-condition-specific advice, consult your healthcare professional."

Health-related personalization should be conservative.

---

# 24. Diet Planning

Create a Diet Plan capability.

The system should generate plans based on:

* Primary goal
* Calorie target
* Protein target
* Dietary preference
* Allergies
* Intolerances
* Disliked foods
* Typical eating patterns
* Previous meals
* Regional food preferences
* User history

For example, for an Indian vegetarian user, recommendations can include culturally appropriate foods rather than generic Western meal plans.

The plan should be dynamic.

Do not create a static PDF-like diet chart.

---

# 25. Personalized Recommendations

The recommendation engine should consider:

1. Goal
2. Current nutrition
3. Recent nutrition
4. Activity
5. Sleep
6. User preferences
7. Historical behavior
8. Health constraints
9. Previous recommendations
10. User feedback

Example:

If protein has been low for 4 consecutive days:

> "Your average protein intake has been below your target this week. Consider adding a protein-rich breakfast tomorrow."

Do not overwhelm the user.

Prefer **one or two high-impact recommendations**.

---

# 26. Weekly Progress

Create a Progress screen.

Show:

### Weight trend

Graph

### Calories

Average calories/day

### Protein

Average protein/day

### Steps

Average steps/day

### Sleep

Average sleep duration

### Goal progress

Current weight → target weight

Then AI-generated summary:

> Your strongest improvement this week was activity.

> Protein was below target on 4 days.

> Your weight trend is moving toward your goal.

Then:

### Focus for next week

One actionable recommendation.

---

# 27. Food History

Food screen should show:

* Today
* Yesterday
* Previous days

Each meal should display:

Food
Quantity
Calories
Protein

Tapping a meal opens details.

Allow:

* Edit
* Delete
* Duplicate
* Add to favorites
* Mark as recurring meal

---

# 28. Personal Food Memory

If a user repeatedly logs:

"2 chapatis"

the system can learn their typical serving.

If the user says:

"My usual breakfast"

the system may resolve it against saved frequent meals.

Create:

`FavoriteFood`
`FrequentMeal`

Do not make this opaque.

The user should be able to see/edit learned meals.

---

# 29. Notifications Architecture

Create a centralized notification system.

Notification types:

* Water
* Sleep
* Screen break
* Meal suggestions
* Goal progress
* Weekly summary
* Important health insight

Every notification category must be independently configurable.

Settings:

* Enabled/disabled
* Frequency
* Quiet hours
* Preferred time

Respect device-level notification permissions.

---

# 30. Settings

Profile/settings should include:

Account
Body metrics
Goals
Diet
Allergies
Health information
Notifications
Health integrations
Privacy
Data export
Delete account

---

# 31. Privacy

Treat health and nutrition data as sensitive.

Implement:

* Secure authentication
* Authorization checks
* Encryption in transit
* Secure secrets management
* No sensitive information in logs
* No health data in analytics events unless explicitly designed
* Account deletion
* Data export
* Clear consent for health integrations

Never expose one user's data to another user.

---

# 32. Database

Design a normalized PostgreSQL schema.

At minimum consider:

users
profiles
goals
diet_preferences
allergies
health_conditions
medications
food_entries
food_items
nutrition_records
water_entries
sleep_entries
exercise_entries
weight_entries
health_metrics
daily_summaries
frequent_meals
favorite_foods
notification_preferences
health_integrations
ai_conversations
ai_messages
user_feedback

Add timestamps and appropriate indexes.

Use UUIDs.

Use migrations.

---

# 33. API Design

Create clean API boundaries.

Examples:

POST /auth
GET /me
PATCH /me/profile

POST /food/interpret
POST /food/entries
GET /food/entries

POST /water
GET /water/today

POST /weight
GET /weight/history

POST /sleep
GET /sleep/history

GET /dashboard/today

GET /progress/weekly

POST /coach/message

GET /recommendations

GET /diet-plan

POST /health/connect
GET /health/status

POST /notifications/preferences

Use proper validation and error handling.

---

# 34. AI Structured Output

Do NOT rely on parsing free-form LLM text.

Use structured output/function calling.

For example:

```json
{
  "events": [
    {
      "type": "food",
      "timestamp": "2026-08-25T12:00:00",
      "items": [
        {
          "name": "chapati",
          "quantity": 2,
          "unit": "medium"
        },
        {
          "name": "curry",
          "quantity": 200,
          "unit": "g",
          "preparation": "less_oily",
          "spice_level": "medium"
        },
        {
          "name": "salad",
          "quantity": 1,
          "unit": "bowl"
        }
      ]
    }
  ]
}
```

Create proper TypeScript schemas for this.

Validate every LLM response.

Never trust raw model output.

---

# 35. Error Handling

The application must gracefully handle:

* Speech recognition failure
* Network failure
* LLM timeout
* Nutrition database failure
* Invalid food
* Ambiguous food
* Authentication failure
* Health API unavailable
* Permission denied
* Notification permission denied

Never lose the user's spoken input if processing fails.

Where possible, allow retry.

---

# 36. UX Quality

The UI must feel polished.

Use:

* Clean typography
* Large touch targets
* Consistent spacing
* Subtle animations
* Skeleton loaders
* Empty states
* Friendly error states
* Accessible contrast
* Light and dark mode
* Responsive layouts

Avoid:

* Dense dashboards
* Excessive cards
* Excessive gradients
* Tiny text
* Unnecessary navigation
* Long forms
* Technical terminology

---

# 37. Voice UX

The voice interaction should feel premium.

States:

### Idle

🎙️

"Tell me what you ate"

### Recording

Animated microphone

"Listening..."

### Processing

"Understanding..."

### Interpretation

"I understood:

2 chapatis
200g curry
1 bowl salad"

Then:

"Estimated 520 kcal"

Buttons:

Confirm
Edit

Do not force confirmation for every trivial event if confidence is high.

Allow users to change this behavior in settings:

* Auto-log high-confidence entries
* Always confirm

---

# 38. Design Language

The application should feel:

* Modern
* Calm
* Trustworthy
* Health-focused
* Intelligent
* Minimal
* Premium

Avoid making it look like a medical hospital application.

Avoid making it look like a bodybuilding-only application.

It should work for normal people trying to improve their health.

---

# 39. Empty States

Design thoughtful empty states.

Example Home:

> Good morning 👋
>
> Start by telling me what you ate.

CTA:

🎙️ Log your first meal

Coach:

> I'm still getting to know you.
>
> Log a few meals and I'll start identifying patterns.

Progress:

> Your progress story starts today.

---

# 40. Gamification

Keep gamification subtle.

Possible concepts:

* Daily consistency
* Weekly streak
* Goal progress
* Healthy habit score

Do NOT make the application feel like a game.

The primary motivation should come from useful feedback.

---

# 41. Analytics

Track product analytics such as:

* onboarding completion
* voice logging usage
* food logging frequency
* correction rate
* notification engagement
* coach usage
* health integration adoption

Do not log sensitive raw health content into analytics.

For example, do not send:

> "User ate 200g paneer."

to a generic analytics system.

Instead track:

`food_log_created = true`

---

# 42. Testing

Implement:

### Unit tests

* Calorie calculations
* Macro calculations
* Goal calculations
* Food parser
* Confidence logic
* Daily aggregation
* Reminder scheduling

### Integration tests

* Authentication
* Food logging
* Database persistence
* Coach context generation
* Health integration abstraction

### UI tests

At least test:

* onboarding
* voice logging
* meal confirmation
* dashboard
* editing a meal
* notification settings

---

# 43. Seed Data

Create development seed data for a sample user.

Example:

Name:
Demo User

Goal:
Weight loss

Diet:
Vegetarian

Sample meals:

Breakfast:
Banana + protein shake

Lunch:
2 chapatis + dal + salad

Snack:
Tea

Dinner:
Paneer + vegetables

Use this to make the dashboard immediately demonstrate the product.

---

# 44. Development Modes

Create a mock mode so the application can be demonstrated without external APIs.

For example:

`MOCK_AI=true`

`MOCK_HEALTH_DATA=true`

`MOCK_SPEECH=true`

This allows the full UX to be tested without requiring production credentials.

But keep clean interfaces so real providers can be plugged in later.

---

# 45. Environment Configuration

Create:

`.env.example`

Include placeholders for:

DATABASE_URL
AI_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SPEECH_API_KEY
NUTRITION_API_KEY
etc.

Never hardcode secrets.

Never commit real API keys.

---

# 46. Documentation

Create a strong README containing:

* Product overview
* Architecture
* Tech stack
* Setup instructions
* Environment variables
* Database setup
* Migration commands
* Running locally
* Running tests
* Mock mode
* AI configuration
* Health integration setup
* Deployment instructions
* Security considerations

Also create:

`ARCHITECTURE.md`

and

`PRODUCT.md`

documenting major decisions.

---

# 47. Implementation Priority

Build in this order:

## Phase 1

1. Project setup
2. Authentication
3. User profile
4. Onboarding
5. Database
6. Home dashboard
7. Food entry model
8. Manual food entry
9. Voice logging
10. AI food interpretation
11. Nutrition calculation
12. Food history

## Phase 2

13. Water tracking
14. Weight tracking
15. Sleep tracking
16. Reminders
17. Screen breaks
18. Goals
19. Progress dashboard
20. Weekly insights

## Phase 3

21. AI Coach
22. Personalized recommendations
23. Diet plans
24. Frequent meals
25. User memory

## Phase 4

26. Health Connect
27. Activity synchronization
28. Sleep synchronization
29. Wearable integrations
30. Advanced insights

---

# 48. Important Product Behavior

The application should continuously move toward this experience:

User says:

> "I had two rotis, dal and salad."

The app responds:

> Logged lunch — estimated 460 kcal and 19g protein.

Then dashboard automatically updates.

Later:

> "How am I doing today?"

The coach knows the current state.

Later:

> "What should I have for dinner?"

The coach knows:

* today's calories
* today's protein
* user's goal
* dietary preferences
* previous meals
* activity
* typical eating patterns

And provides a personalized answer.

That is the core product loop.

---

# 49. Do Not Overbuild the First Version

Prioritize a complete, working vertical slice over implementing dozens of incomplete features.

The most important end-to-end flow is:

Registration
→ onboarding
→ Home
→ microphone
→ speech
→ food interpretation
→ nutrition calculation
→ confirmation
→ database
→ updated dashboard

This flow must feel excellent.

---

# 50. Final Acceptance Criteria

Consider the first version successful only if I can:

1. Create an account.

2. Complete onboarding.

3. Set a health/fitness goal.

4. Set dietary preferences.

5. Open Home.

6. Tap the microphone.

7. Say:

   "I ate a banana."

8. See the interpreted food.

9. See estimated calories/macros.

10. Confirm it.

11. See it appear in today's meals.

12. See daily calories update.

13. Log a complex meal using natural language.

14. Edit an incorrectly interpreted meal.

15. Log water.

16. Log weight.

17. Configure reminders.

18. View progress.

19. Ask the AI Coach a question.

20. Receive a response based on the user's actual stored data.

21. Run the app in mock mode without external API credentials.

---

# 51. How I Want You to Work

Do not dump hundreds of files at once without validation.

Work incrementally.

For each major phase:

1. Inspect existing code.
2. Implement the feature.
3. Run tests/type checking.
4. Fix errors.
5. Verify the feature.
6. Move to the next phase.

If a dependency or external service is unavailable, create a clean abstraction/mock implementation rather than blocking the entire project.

When there are architectural choices, prefer:

* simplicity
* maintainability
* strong typing
* testability
* provider independence
* secure handling of health data
* excellent UX

Do not optimize prematurely.

---

# 52. Start Now

First:

1. Inspect the repository.
2. Give me a concise assessment of the existing codebase.
3. Give me the proposed architecture.
4. Give me the implementation phases.
5. Then start implementing Phase 1.

Do not stop after giving me a plan.

**I want you to actually build the application.**
