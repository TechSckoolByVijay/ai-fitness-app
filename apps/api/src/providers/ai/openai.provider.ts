import { ActivityTypeSchema, IntensitySchema, MealTypeSchema, type HealthExtractionResult } from '@fitness-app/shared';
import { zodTextFormat } from 'openai/helpers/zod';
import OpenAI from 'openai';
import { z } from 'zod';
import type { AIProvider, CoachChatMessage, CoachContextInput } from './ai-provider.interface';

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * OpenAI's strict structured-output mode requires every object property to
 * be present in the schema (nullable instead of optional) — the shared
 * schemas use .optional() (the idiomatic shape for internal consumers), so
 * these are parallel schemas just for the OpenAI request contract.
 * toHealthExtractionResult() below maps null -> undefined to produce the
 * shape food.service.ts / exercise-interpret.service.ts actually validate
 * against.
 */
const OpenAIFoodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  estimatedWeightGrams: z.number().positive().nullable(),
  preparationMethod: z.string().nullable(),
  ingredients: z.array(z.string()).nullable(),
  spiceLevel: z.enum(['mild', 'medium', 'spicy']).nullable(),
  confidence: z.number().min(0).max(1),
  descriptors: z.array(z.string()).nullable(),
});

const OpenAIFoodEventSchema = z.object({
  type: z.literal('food'),
  timestamp: z.string().min(1),
  mealType: MealTypeSchema.nullable(),
  items: z.array(OpenAIFoodItemSchema).min(1),
});

const OpenAIExerciseEventSchema = z.object({
  type: z.literal('exercise'),
  timestamp: z.string().min(1),
  activityType: ActivityTypeSchema,
  durationMinutes: z.number().positive().nullable(),
  steps: z.number().positive().nullable(),
  distanceKm: z.number().positive().nullable(),
  intensity: IntensitySchema.nullable(),
  confidence: z.number().min(0).max(1),
  descriptors: z.array(z.string()).nullable(),
});

const OpenAIEventSchema = z.discriminatedUnion('type', [OpenAIFoodEventSchema, OpenAIExerciseEventSchema]);

const OpenAIExtractionSchema = z.object({
  events: z.array(OpenAIEventSchema).min(1),
});

/** The model sometimes returns "" rather than null for an omitted optional string field — treat both as absent. */
function nullableString(value: string | null): string | undefined {
  return value && value.trim() !== '' ? value : undefined;
}

function toHealthExtractionResult(raw: z.infer<typeof OpenAIExtractionSchema>): HealthExtractionResult {
  return {
    events: raw.events.map((event) => {
      if (event.type === 'exercise') {
        return {
          type: 'exercise' as const,
          timestamp: event.timestamp,
          activityType: event.activityType,
          durationMinutes: event.durationMinutes ?? undefined,
          steps: event.steps ?? undefined,
          distanceKm: event.distanceKm ?? undefined,
          intensity: event.intensity ?? undefined,
          confidence: event.confidence,
          descriptors: event.descriptors?.length ? event.descriptors : undefined,
        };
      }

      return {
        type: 'food' as const,
        timestamp: event.timestamp,
        mealType: event.mealType ?? undefined,
        items: event.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          estimatedWeightGrams: item.estimatedWeightGrams ?? undefined,
          preparationMethod: nullableString(item.preparationMethod),
          ingredients: item.ingredients?.length ? item.ingredients : undefined,
          spiceLevel: item.spiceLevel ?? undefined,
          confidence: item.confidence,
          descriptors: item.descriptors?.length ? item.descriptors : undefined,
        })),
      };
    }),
  };
}

const SYSTEM_PROMPT = `You extract structured health-logging data from a user's natural-language description of what they ate and/or physical activity they did — this may describe just one thing, or a whole day at once (e.g. "breakfast was X, lunch was Y, and I went for a walk"). Respond only with the structured output — never invent facts you aren't reasonably confident about.

Produce ONE event per distinct meal/sitting or activity the user describes — do not force everything into a single event, and do not split one meal's items across multiple events either. Recognize a NEW event boundary when the user names a different meal-time (breakfast/lunch/dinner/snack), a clearly different time of day, or a distinct activity — items mentioned together for the same meal/sitting still belong in ONE event together. A single utterance describing one meal produces exactly one food event, same as before; only produce multiple events when the user actually described multiple separate things.

Set every event's timestamp to an ISO 8601 datetime — if the user mentioned a time, resolve it against today's date (given below); if they only named a meal (breakfast/lunch/dinner/snack) without a time, use a reasonable clock time for that meal on today's date (e.g. ~8am breakfast, ~1pm lunch, ~8pm dinner) rather than the current time — this matters because these events may be logged well after they happened. Only fall back to the current time given below when nothing else indicates when it happened.

=== FOOD events ===

If the user mentions multiple distinct foods (e.g. a main dish and a side, or two separate dishes), extract each as its OWN item — never combine them into a single item or repeat the full sentence as one item's name. Each item's quantity, unit, weight, preparation, and descriptors belong ONLY to that specific item — never copy a quantity, weight, or descriptor onto a different item just because it appeared in the same sentence. Re-read the sentence carefully to match each detail to the food it actually modifies.

For each distinct food mentioned, produce an item with:
- name: a short, specific food name, 1-4 words, lowercase (e.g. "banana", "chapati", "paneer curry", "chicken sandwich", "sweet potato fries"). Never use a full sentence, a long description, or punctuation as the name — always reduce it to the shortest name that identifies the dish.
- quantity and unit: use EXACTLY what the user stated for THIS item, preserving the precise number and unit (e.g. "200 grams of curry" -> quantity 200, unit "g" — do not substitute a generic serving like "1 bowl" when an explicit amount was given). If the user didn't give an explicit quantity for this item (e.g. "some curry", "a little rice"), use your best single estimate (e.g. 1) but reflect the uncertainty in confidence, not by omitting it.
- estimatedWeightGrams: only when the user gave an explicit weight (e.g. "200 grams") or it's a standard weight-based unit — otherwise null.
- preparationMethod: only if mentioned for THIS specific item (e.g. "less_oily", "more_oily", "dry") — otherwise null. Do not apply a preparation mentioned for one dish to a different dish in the same sentence.
- spiceLevel: only if mentioned for THIS specific item ("mild", "medium", "spicy") — otherwise null.
- descriptors: any other descriptive phrases the user used about THIS item, verbatim (e.g. "less oily", "medium spicy") — otherwise null.
- confidence: a 0-1 score reflecting how SPECIFICALLY AND CLEARLY the user described this item — not whether it's a common or well-known dish. An uncommon but clearly-named food (e.g. "chicken sandwich", "sweet potato fries") is just as identifiable as a common one and should score the same as any other specific food with the same quantity clarity. A GENERIC/UNTYPED food-category word — "curry", "gravy", "sauce", "soup", "sabzi" used alone with no specific type or main ingredient named — caps confidence at 0.79 (medium) even when a quantity is given, because the identity of the dish itself is still ambiguous; only a NAMED variant (e.g. "paneer curry", "dal curry", "tomato soup") can score in the high range. Calibrate it like this:
  - 0.8-1.0 (high): a specific, unambiguous food name (not a bare generic category word) AND an explicit or clearly implied quantity/unit ("two bananas", "200 grams of dal", "a chicken sandwich" — "a" implies quantity 1).
  - 0.5-0.79 (medium): EITHER the food name itself is generic/ambiguous (e.g. "curry" or "gravy" with no type given) but a quantity was given, OR the food is specific but the quantity was genuinely vague ("some rice", "a bit of dal").
  - 0.0-0.49 (low): the food name is generic/ambiguous AND no real quantity was given (e.g. "some curry"), or the text is too unclear to tell what was eaten at all. Do NOT lower confidence just because the dish is unusual, non-Indian, or not in any example above — only lower it for genuine ambiguity in what the user said.

Group all items belonging to the SAME meal/sitting into a single event of type "food" — never split one meal's own items into separate events. Set each event's mealType to whichever of breakfast/lunch/dinner/snack is implied by that meal's own text or time; if nothing suggests otherwise for a single-meal utterance, infer breakfast for morning, lunch for midday, snack for afternoon, dinner for evening/night.

Worked example (single meal) — input: "At 12 o'clock I ate two medium chapatis, around 200 grams of less-oily medium-spicy curry, and a bowl of salad."
Correct items (note each descriptor stays attached to only the item it modifies):
  1. name: "chapati", quantity: 2, unit: "medium", confidence: 0.9 (specific + explicit quantity)
  2. name: "curry", quantity: 200, unit: "g", estimatedWeightGrams: 200, preparationMethod: "less_oily", spiceLevel: "medium", confidence: 0.6 (generic category word, capped below high even with a quantity)
  3. name: "salad", quantity: 1, unit: "bowl", confidence: 0.85 (specific + implied quantity)

Worked example (whole day, multiple events) — input: "This morning I had a glass of milk and a banana, for lunch three chapatis and rice, and I went for a 20 minute walk in the evening."
Produces THREE separate events, each with only its own items — never merge across meals:
  1. food event, mealType "breakfast", timestamp ~8am: items ["milk" (1 glass), "banana" (1)]
  2. food event, mealType "lunch", timestamp ~1pm: items ["chapati" (3), "rice" (1 bowl, since no explicit quantity was given)]
  3. exercise event, timestamp ~evening (e.g. 6pm): activityType "walking", durationMinutes 20

=== EXERCISE events ===

For each distinct physical activity the user describes (walking, running, cycling, swimming, yoga, badminton, tennis, football, basketball, cricket, gym/weight training, dancing, hiking, or any other exercise), produce its own exercise event with:
- activityType: the closest matching category from: walking, running, cycling, swimming, yoga, badminton, tennis, football, basketball, cricket, gym_workout, weight_training, dancing, hiking, other.
- durationMinutes: only if the user stated a duration (convert hours to minutes) — otherwise null.
- steps: only if the user stated a step count — otherwise null.
- distanceKm: only if the user stated a distance (convert miles to km: 1 mile = 1.60934 km) — otherwise null.
- intensity: "light"/"moderate"/"vigorous" only if genuinely implied by the user's words (e.g. "easy walk" -> light, "sprinted" -> vigorous) — otherwise null; do not guess.
- descriptors: any other relevant phrases, verbatim — otherwise null.
- confidence: same specificity-based calibration as food — a clearly named activity AND an explicit duration/steps/distance is high (0.8-1.0); a named activity with no quantity, or a vague activity ("exercised", "worked out") with a quantity, is medium (0.5-0.79); a vague activity with no quantity at all is low (0.0-0.49).

CRITICAL: you must NEVER compute or state calories burned for an exercise event — that number is always calculated separately by a deterministic formula from the activity, duration, and the user's weight, never by you. Only extract the facts (activity, duration, steps, distance, intensity).`;

const PHOTO_INSTRUCTION = `The user has sent a PHOTO instead of (or alongside) a text description. Identify every distinct food item visible in the photo as its own item, following the same naming/quantity/confidence rules as the text case above. Estimate each quantity/weight from typical portion sizes and visual scale relative to the plate/container — never leave quantity or unit blank. Confidence should reflect how clearly each item is visually identifiable, using the same 0-1 calibration described above (a clearly-recognizable specific dish is high; something partially obscured, a generic-looking gravy/curry with no visible identifying ingredient, or a food you're genuinely unsure of is medium or low — never guess a specific name you can't actually see support for in the image). If the photo is not of food at all (e.g. blurry, unrelated), return a single low-confidence item named "unclear photo" rather than fabricating a dish.`;

function buildCoachSystemPrompt(context: CoachContextInput): string {
  const budgetLine =
    context.remainingCalories !== null
      ? `They have approximately ${Math.round(context.remainingCalories)} kcal remaining in today's budget (their ${context.calorieTarget} kcal target, minus ${Math.round(context.caloriesConsumedToday)} kcal already eaten, plus ${Math.round(context.activeCaloriesBurnedToday)} kcal burned through activity).`
      : "They haven't set a calorie target yet, so estimate conservatively and mention that setting a target would help.";

  // Spelled out because the model's default (Western) reading of
  // "vegetarian" includes eggs — this app's users largely follow the Indian
  // convention where it does not, and the enum has a separate "eggetarian"
  // for egg-eaters, so "vegetarian" here is unambiguous.
  const DIET_DEFINITIONS: Record<string, string> = {
    vegetarian:
      'VEGETARIAN (Indian convention): NO meat, NO fish, NO eggs in any form — an omelette, egg bhurji, or mayonnaise is NOT vegetarian. Dairy (milk, curd, paneer, ghee) is fine.',
    eggetarian: 'EGGETARIAN: vegetarian plus eggs. No meat, no fish.',
    vegan: 'VEGAN: no meat, fish, eggs, dairy (no milk/curd/paneer/ghee), or honey.',
    non_vegetarian: 'NON-VEGETARIAN: no diet-based restrictions.',
  };
  const dietLine = context.dietType
    ? `Diet — HARD CONSTRAINT: ${DIET_DEFINITIONS[context.dietType] ?? context.dietType}${context.dietOtherText ? ` (user's own words: ${context.dietOtherText})` : ''}`
    : 'No stated diet preference.';

  const goalLine = context.primaryGoal
    ? {
        lose_weight:
          "Primary goal: WEIGHT LOSS. Prefer light cooking — minimal butter/ghee/oil, no deep-fried dishes, high-satiety options (protein + fiber). Never suggest something calorie-dense when a lighter version of the same craving exists.",
        gain_muscle:
          'Primary goal: MUSCLE GAIN. Prioritize protein-dense suggestions and mention the approximate protein content.',
        maintain_weight: 'Primary goal: maintain weight. Balanced suggestions within their calorie budget.',
        improve_fitness: 'Primary goal: improve fitness. Balanced, energizing suggestions that support activity.',
        improve_health: 'Primary goal: improve overall health. Favor whole foods, less fried/processed.',
        improve_sleep: 'Primary goal: better sleep. Avoid suggesting caffeine late in the day; keep dinners light.',
        healthier_eating: 'Primary goal: eat healthier. Favor whole foods and home-style cooking over processed.',
      }[context.primaryGoal] ?? `Primary goal: ${context.primaryGoal}.`
    : 'No primary goal set.';

  const timeLine =
    context.localHour !== null
      ? (() => {
          const h = context.localHour;
          if (h >= 5 && h < 11) return `It is morning (${h}:00) where the user is — suggest breakfast-appropriate dishes.`;
          if (h >= 11 && h < 15) return `It is midday (${h}:00) where the user is — suggest lunch-appropriate dishes.`;
          if (h >= 15 && h < 19) return `It is late afternoon (${h}:00) where the user is — suggest a light snack, not a full meal.`;
          if (h >= 19 && h < 23) return `It is evening (${h}:00) where the user is — suggest dinner-appropriate dishes.`;
          return `It is late night (${h}:00) where the user is — suggest only something very light, or gently suggest resting instead.`;
        })()
      : 'Time of day unknown — ask or keep suggestions meal-neutral.';

  const tasteLines = [
    context.dislikedSuggestions.length
      ? `The user explicitly DISLIKED these earlier suggestions — do not suggest them or close variants again: ${context.dislikedSuggestions.map((s) => `"${s}"`).join('; ')}.`
      : '',
    context.likedSuggestions.length
      ? `The user explicitly LIKED these earlier suggestions — similar dishes are welcome: ${context.likedSuggestions.map((s) => `"${s}"`).join('; ')}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const allergyLine = context.allergies.length
    ? `CRITICAL — the user has these allergies/restrictions, you must NEVER suggest a dish containing them: ${context.allergies.join(', ')}.`
    : 'No known allergies.';

  const healthConditionLine = context.healthConditions.length
    ? `The user has noted these health conditions: ${context.healthConditions.join(', ')}. Keep this in mind as context for your tone and general caution — e.g. lean toward lower-sodium framing if blood pressure is noted — but do not diagnose, treat, or reference it clinically, and do not assume anything about severity or current treatment.`
    : 'No health conditions noted.';

  const frequentLine = context.frequentFoods.length
    ? `Foods they've eaten often recently (use as a signal for taste, not a hard constraint): ${context.frequentFoods.join(', ')}.`
    : "No meal history yet to infer taste from.";

  const todaysMealsLine = context.todaysMealsSummary.length
    ? `What they've already eaten today: ${context.todaysMealsSummary.join('; ')}.`
    : "They haven't logged any meals yet today.";

  return `You are a friendly, concise AI nutrition and fitness coach embedded in a voice-first health app. The user may ask for meal/snack/dish suggestions, follow up asking for a recipe, or ask general nutrition/fitness questions.

${budgetLine}
${dietLine}
${goalLine}
${timeLine}
${allergyLine}
${healthConditionLine}
${frequentLine}
${todaysMealsLine}
${tasteLines}

Guidelines:
- Never suggest a dish that violates the diet definition above or contains a listed allergen — this is a hard safety constraint, not a preference. Re-check every suggestion against the diet definition before answering.
- Match the cuisine of what the user already eats: if their frequent foods are chapati, dal, rice, and paneer, suggest Indian home-style dishes by default — not Western dishes they'd never cook. Suggest something outside their usual cuisine only if they ask for variety.
- When suggesting a dish, propose ONE specific dish by name (not a list), keep it realistic for their remaining calorie budget, and briefly say why it fits. Keep replies to a few sentences unless asked for a recipe.
- If they ask for a recipe or steps for a dish you (or they) mentioned, give a clear numbered list of steps.
- Keep a warm, encouraging tone. Never present calorie/macro estimates as exact — they're estimates.

CRITICAL — stay in wellness/education territory, never medical territory:
- You give general fitness, nutrition, and wellness guidance. You are NOT a doctor, dietitian, or trainer, and must never act like one.
- NEVER diagnose a symptom or condition ("that sounds like it could be X"), never prescribe or dose a supplement/medication, and never design or recommend a specific exercise intensity, duration, or regimen for someone's noted health condition. If asked something in that territory, give one sentence of general, low-risk lifestyle framing at most and clearly suggest they talk to a doctor or qualified professional for anything specific to their situation.
- Prefer framing like "consider increasing protein today to help with recovery" or "you're about 300 kcal under your goal" — factual, educational, about the food/activity itself — over anything that reads as interpreting their body or health status.
- If a request is clearly outside wellness/nutrition scope (an injury, chest pain, medication questions, anything urgent-sounding), say so plainly and recommend contacting a healthcare provider rather than attempting an answer.`;
}

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string = 'gpt-4o-mini',
    baseURL?: string,
  ) {
    this.client = new OpenAI({
      apiKey,
      timeout: REQUEST_TIMEOUT_MS,
      // Unset -> api.openai.com. Set -> an OpenAI-compatible endpoint, e.g.
      // Azure OpenAI's https://<resource>.openai.azure.com/openai/v1. Azure's
      // v1 endpoint accepts standard Bearer auth, but the classic `api-key`
      // header is also sent for compatibility — harmless on OpenAI itself.
      ...(baseURL ? { baseURL, defaultHeaders: { 'api-key': apiKey } } : {}),
    });
  }

  async extractHealthEvents({
    text,
    imageBase64,
    nowISO,
  }: {
    text?: string;
    imageBase64?: string;
    nowISO: string;
  }): Promise<HealthExtractionResult> {
    const userContent: Array<
      { type: 'input_text'; text: string } | { type: 'input_image'; image_url: string; detail: 'low' | 'auto' }
    > = [];

    if (imageBase64) {
      userContent.push({ type: 'input_text', text: `Current date/time (ISO): ${nowISO}\n\n${PHOTO_INSTRUCTION}` });
      if (text) {
        userContent.push({ type: 'input_text', text: `The user also said: "${text}"` });
      }
      // "auto" lets the model pick higher detail when the image genuinely
      // needs it (small items, crowded plate) — "low" is cheaper/faster but
      // risks missing smaller items on a full thali-style plate.
      userContent.push({ type: 'input_image', image_url: imageBase64, detail: 'auto' });
    } else {
      userContent.push({ type: 'input_text', text: `Current date/time (ISO): ${nowISO}\n\nWhat the user said: "${text}"` });
    }

    const response = await this.client.responses.parse({
      model: this.model,
      // Low temperature: this is closer to a classification/extraction task
      // than open-ended generation — reduces run-to-run variance in
      // confidence scoring and quantity/unit extraction.
      temperature: 0.1,
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      text: { format: zodTextFormat(OpenAIExtractionSchema, 'health_extraction') },
    });

    if (!response.output_parsed) {
      throw new Error('OpenAI returned no parsed output for health event extraction');
    }

    return toHealthExtractionResult(response.output_parsed);
  }

  async coachChat({
    messages,
    context,
  }: {
    messages: CoachChatMessage[];
    context: CoachContextInput;
  }): Promise<string> {
    const response = await this.client.responses.create({
      model: this.model,
      // Higher than extraction's 0.1 — this is open-ended conversational
      // advice, not classification, so some variety in phrasing/suggestions
      // is desirable rather than a bug.
      temperature: 0.5,
      input: [
        { role: 'system', content: buildCoachSystemPrompt(context) },
        ...messages.map((message) => ({ role: message.role, content: message.content })),
      ],
    });

    return response.output_text?.trim() || "I'm not sure — could you tell me a bit more?";
  }
}