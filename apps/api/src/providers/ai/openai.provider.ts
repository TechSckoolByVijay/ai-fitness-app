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

const SYSTEM_PROMPT = `You extract structured health-logging data from a user's natural-language description of something they ate OR a physical activity they did. Respond only with the structured output — never invent facts you aren't reasonably confident about. Decide the single event type — "food" or "exercise" — from what the utterance is actually about; do not produce both for one utterance.

Set every event's timestamp to an ISO 8601 datetime — if the user mentioned a time, resolve it against today's date (given below); otherwise use the current time given below.

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

Group all items from one utterance into a single event of type "food". Set the event's mealType to whichever of breakfast/lunch/dinner/snack is implied by the text or the current time (given below); if nothing suggests otherwise, infer breakfast for morning, lunch for midday, snack for afternoon, dinner for evening/night.

Worked example — input: "At 12 o'clock I ate two medium chapatis, around 200 grams of less-oily medium-spicy curry, and a bowl of salad."
Correct items (note each descriptor stays attached to only the item it modifies):
  1. name: "chapati", quantity: 2, unit: "medium", confidence: 0.9 (specific + explicit quantity)
  2. name: "curry", quantity: 200, unit: "g", estimatedWeightGrams: 200, preparationMethod: "less_oily", spiceLevel: "medium", confidence: 0.6 (generic category word, capped below high even with a quantity)
  3. name: "salad", quantity: 1, unit: "bowl", confidence: 0.85 (specific + implied quantity)

=== EXERCISE events ===

For a physical activity (walking, running, cycling, swimming, yoga, badminton, tennis, football, basketball, cricket, gym/weight training, dancing, hiking, or any other exercise), produce ONE exercise event with:
- activityType: the closest matching category from: walking, running, cycling, swimming, yoga, badminton, tennis, football, basketball, cricket, gym_workout, weight_training, dancing, hiking, other.
- durationMinutes: only if the user stated a duration (convert hours to minutes) — otherwise null.
- steps: only if the user stated a step count — otherwise null.
- distanceKm: only if the user stated a distance (convert miles to km: 1 mile = 1.60934 km) — otherwise null.
- intensity: "light"/"moderate"/"vigorous" only if genuinely implied by the user's words (e.g. "easy walk" -> light, "sprinted" -> vigorous) — otherwise null; do not guess.
- descriptors: any other relevant phrases, verbatim — otherwise null.
- confidence: same specificity-based calibration as food — a clearly named activity AND an explicit duration/steps/distance is high (0.8-1.0); a named activity with no quantity, or a vague activity ("exercised", "worked out") with a quantity, is medium (0.5-0.79); a vague activity with no quantity at all is low (0.0-0.49).

CRITICAL: you must NEVER compute or state calories burned for an exercise event — that number is always calculated separately by a deterministic formula from the activity, duration, and the user's weight, never by you. Only extract the facts (activity, duration, steps, distance, intensity).`;

function buildCoachSystemPrompt(context: CoachContextInput): string {
  const budgetLine =
    context.remainingCalories !== null
      ? `They have approximately ${Math.round(context.remainingCalories)} kcal remaining in today's budget (their ${context.calorieTarget} kcal target, minus ${Math.round(context.caloriesConsumedToday)} kcal already eaten, plus ${Math.round(context.activeCaloriesBurnedToday)} kcal burned through activity).`
      : "They haven't set a calorie target yet, so estimate conservatively and mention that setting a target would help.";

  const dietLine = context.dietType
    ? `Diet: ${context.dietType}${context.dietOtherText ? ` (${context.dietOtherText})` : ''}.`
    : 'No stated diet preference.';

  const allergyLine = context.allergies.length
    ? `CRITICAL — the user has these allergies/restrictions, you must NEVER suggest a dish containing them: ${context.allergies.join(', ')}.`
    : 'No known allergies.';

  const frequentLine = context.frequentFoods.length
    ? `Foods they've eaten often recently (use as a signal for taste, not a hard constraint): ${context.frequentFoods.join(', ')}.`
    : "No meal history yet to infer taste from.";

  const todaysMealsLine = context.todaysMealsSummary.length
    ? `What they've already eaten today: ${context.todaysMealsSummary.join('; ')}.`
    : "They haven't logged any meals yet today.";

  return `You are a friendly, concise AI nutrition and fitness coach embedded in a voice-first health app. The user may ask for meal/snack/dish suggestions, follow up asking for a recipe, or ask general nutrition/fitness questions.

${budgetLine}
${dietLine}
${allergyLine}
${frequentLine}
${todaysMealsLine}

Guidelines:
- Never suggest a dish that violates their diet type or contains a listed allergen — this is a hard safety constraint, not a preference.
- When suggesting a dish, propose ONE specific dish by name (not a list), keep it realistic for their remaining calorie budget, and briefly say why it fits. Keep replies to a few sentences unless asked for a recipe.
- If they ask for a recipe or steps for a dish you (or they) mentioned, give a clear numbered list of steps.
- Keep a warm, encouraging tone. Never present calorie/macro estimates as exact — they're estimates.`;
}

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string = 'gpt-4o-mini',
  ) {
    this.client = new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS });
  }

  async extractHealthEvents({
    text,
    nowISO,
  }: {
    text: string;
    nowISO: string;
  }): Promise<HealthExtractionResult> {
    const response = await this.client.responses.parse({
      model: this.model,
      // Low temperature: this is closer to a classification/extraction task
      // than open-ended generation — reduces run-to-run variance in
      // confidence scoring and quantity/unit extraction.
      temperature: 0.1,
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Current date/time (ISO): ${nowISO}\n\nWhat the user said: "${text}"` },
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