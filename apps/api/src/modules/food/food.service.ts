import {
  InterpretedMealSchema,
  sumNutrition,
  type FoodExtractionEvent,
  type InterpretedFoodItem,
  type InterpretedMeal,
  type MealType,
} from '@fitness-app/shared';
import { findFoodEntry } from '../../providers/nutrition/food-table';
import { isAmbiguousUnit, sizeOptionsFor } from '../../providers/nutrition/resolve-grams';
import type { NutritionService } from '../../providers/nutrition/nutrition-service.interface';
import { NO_OVERRIDES, type UserOverrides } from '../users/user-preferences.service';
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

/**
 * A container word with no stated weight is not something to guess at. "One
 * bowl of dal" is 150g or 400g depending on the house, a spread wide enough
 * to make the day's total meaningless, so the tier is forced down and the
 * existing clarification path asks.
 *
 * Skipped entirely when the model supplied an explicit weight — it saw a
 * photo, or the user said "200g", and that beats any question.
 */
function adjustConfidenceForAmbiguousUnit(
  item: { unit: string; estimatedWeightGrams?: number },
  aiConfidence: number,
  overrides: UserOverrides,
): number {
  // Once someone has told us what their bowl weighs, it stops being a
  // question. Asking again would make the memory feel worthless.
  if (overrides.unitWeights[item.unit.trim().toLowerCase()] !== undefined) return aiConfidence;
  if (item.estimatedWeightGrams) return aiConfidence;
  if (!isAmbiguousUnit(item.unit)) return aiConfidence;
  return Math.min(aiConfidence, GENERIC_FOOD_LOW_CONFIDENCE_FLOOR);
}

function buildClarifyingQuestion(
  items: InterpretedFoodItem[],
): { clarifyingQuestion: string; quickOptions: string[] } | undefined {
  const lowItem = items.find((item) => item.tier === 'low');
  if (!lowItem) return undefined;

  // Size question first: knowing how big the bowl was is more useful than
  // knowing which curry it held, and it is the more answerable question.
  if (!lowItem.estimatedWeightGrams && isAmbiguousUnit(lowItem.unit)) {
    const options = sizeOptionsFor(lowItem.unit);
    if (options.length > 0) {
      return {
        clarifyingQuestion: `How big was the ${lowItem.unit.toLowerCase()} of ${lowItem.name}?`,
        // Phrased so the answer re-interprets naturally, and with the gram
        // figure shown so the choice is informed rather than a guess.
        quickOptions: [...options.map((o) => `${o.label} (about ${o.grams} g)`), 'Add manually'],
      };
    }
  }

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
  overrides: UserOverrides = NO_OVERRIDES,
): Promise<InterpretedMeal> {
  const items: InterpretedFoodItem[] = await Promise.all(
    event.items.map(async (item) => {
      const nutrition = await nutritionService.lookup({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedWeightGrams: item.estimatedWeightGrams,
        preparationMethod: item.preparationMethod,
        unitWeightOverrides: overrides.unitWeights,
      });

      const confidence = adjustConfidenceForAmbiguousUnit(
        item,
        adjustConfidenceForGenericFood(item.name, item.confidence),
        overrides,
      );

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
