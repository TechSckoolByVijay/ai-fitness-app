import {
  InterpretedMealSchema,
  sumNutrition,
  type FoodExtractionEvent,
  type InterpretedFoodItem,
  type InterpretedMeal,
  type MealType,
} from '@fitness-app/shared';
import { findFoodEntry } from '../../providers/nutrition/food-table';
import type { NutritionService } from '../../providers/nutrition/nutrition-service.interface';
import {
  classifyItemConfidence,
  classifyMealConfidence,
  HIGH_CONFIDENCE_THRESHOLD,
  MEDIUM_CONFIDENCE_THRESHOLD,
  shouldAutoLog,
} from '../confidence';

// User-facing requirement: never save a logged meal without an explicit
// Confirm tap, even at high confidence — the interpretation (and any
// calorie-slider correction) must always be reviewable before it's
// persisted. No per-user override exists for this yet.
const DEFAULT_AUTO_LOG_SETTING = false;
const GENERIC_FOOD_CONFIDENCE_CEILING = HIGH_CONFIDENCE_THRESHOLD - 0.01;
const GENERIC_FOOD_LOW_CONFIDENCE_FLOOR = MEDIUM_CONFIDENCE_THRESHOLD - 0.01;

/**
 * A provider's self-reported confidence score isn't precise enough to trust
 * for tier boundaries on its own (real LLM self-calibration is noisy around
 * exact thresholds, unlike the mock's deterministic scoring). For a known
 * generic/untyped food name (e.g. "curry" with no type given):
 *   - it can never reach the high tier, regardless of what a provider reports
 *     (the dish identity itself is still ambiguous even with a quantity).
 *   - if the provider ALSO reported low-ish confidence (at or below the
 *     medium threshold — i.e. it sensed real uncertainty, not just genericness),
 *     that compounding signal is nudged down into the low tier rather than
 *     left sitting exactly on the medium boundary (spec section 11's "some
 *     curry" example: generic name + no real quantity -> blocking question).
 * Applies uniformly to mock and real providers alike.
 */
function adjustConfidenceForGenericFood(name: string, aiConfidence: number): number {
  const entry = findFoodEntry(name);
  if (!entry?.isGeneric) return aiConfidence;

  if (aiConfidence <= MEDIUM_CONFIDENCE_THRESHOLD) {
    return Math.min(aiConfidence, GENERIC_FOOD_LOW_CONFIDENCE_FLOOR);
  }
  return Math.min(aiConfidence, GENERIC_FOOD_CONFIDENCE_CEILING);
}

function buildClarifyingQuestion(
  items: InterpretedFoodItem[],
): { clarifyingQuestion: string; quickOptions: string[] } | undefined {
  const lowItem = items.find((item) => item.tier === 'low');
  if (!lowItem) return undefined;

  const entry = findFoodEntry(lowItem.name);
  if (entry?.isGeneric && entry.genericOptions) {
    return {
      clarifyingQuestion: `What type of ${entry.canonicalName} was it?`,
      quickOptions: entry.genericOptions,
    };
  }

  if (['meal', 'previous meal', 'food'].includes(lowItem.name)) {
    return {
      clarifyingQuestion: "I didn't quite catch what you ate — could you tell me?",
      quickOptions: ['Add manually'],
    };
  }

  return {
    clarifyingQuestion: `Could you tell me more about "${lowItem.name}"?`,
    quickOptions: ['Add manually'],
  };
}

/**
 * Nutrition lookup + confidence classification + clarifying-question
 * generation for an already-extracted-and-validated food event (spec
 * section 10, minus the AI-extraction step, which now lives in the general
 * event pipeline — see modules/events/event.service.ts).
 */
export async function interpretFoodEvent(
  event: FoodExtractionEvent,
  sourceText: string,
  nutritionService: NutritionService,
): Promise<InterpretedMeal> {
  const items: InterpretedFoodItem[] = await Promise.all(
    event.items.map(async (item) => {
      const nutrition = await nutritionService.lookup({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedWeightGrams: item.estimatedWeightGrams,
        preparationMethod: item.preparationMethod,
      });

      const confidence = adjustConfidenceForGenericFood(item.name, item.confidence);

      return {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedWeightGrams: item.estimatedWeightGrams,
        preparationMethod: item.preparationMethod,
        ingredients: item.ingredients,
        descriptors: item.descriptors,
        confidence,
        tier: classifyItemConfidence(confidence),
        nutrition,
      };
    }),
  );

  const mealTier = classifyMealConfidence(items.map((item) => item.tier));
  const autoLog = shouldAutoLog(mealTier, DEFAULT_AUTO_LOG_SETTING);
  const clarification = mealTier === 'low' ? buildClarifyingQuestion(items) : undefined;

  const meal: InterpretedMeal = {
    mealType: (event.mealType ?? 'snack') as MealType,
    loggedAt: event.timestamp,
    sourceText,
    items,
    tier: mealTier,
    autoLog,
    clarifyingQuestion: clarification?.clarifyingQuestion,
    quickOptions: clarification?.quickOptions,
    estimatedTotals: sumNutrition(items.map((item) => item.nutrition)),
  };

  return InterpretedMealSchema.parse(meal);
}
