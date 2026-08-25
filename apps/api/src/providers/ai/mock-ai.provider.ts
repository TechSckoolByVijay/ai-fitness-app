import type { FoodItemExtraction, HealthExtractionResult } from '@fitness-app/shared';
import { findFoodEntry, FOOD_TABLE, type FoodTableEntry } from '../nutrition/food-table';
import type { AIProvider, CoachChatMessage, CoachContextInput } from './ai-provider.interface';
import { mockCoachReply } from './coach-chat-utils';
import { tryParseExercise } from './exercise-parsing-utils';
import {
  inferMealType,
  parseDescriptors,
  parseQuantity,
  resolveTimestamp,
  splitIntoItemPhrases,
} from './parsing-utils';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchFoodEntry(phraseLower: string): { entry: FoodTableEntry; alias: string } | null {
  let best: { entry: FoodTableEntry; alias: string } | null = null;
  for (const entry of FOOD_TABLE) {
    for (const alias of entry.aliases) {
      if (new RegExp(`\\b${escapeRegex(alias)}\\b`).test(phraseLower)) {
        if (!best || alias.length > best.alias.length) {
          best = { entry, alias };
        }
      }
    }
  }
  return best;
}

/** Splits "tea with two teaspoons of sugar" into ["tea", "two teaspoons of sugar"]
 *  only when the part after "with" names a recognized food — avoids spuriously
 *  splitting descriptive phrases like "curry with less oil". */
function splitOnWithIfFood(phrase: string): string[] {
  const lower = phrase.toLowerCase();
  const withIndex = lower.search(/\bwith\b/);
  if (withIndex === -1) return [phrase];

  const before = phrase.slice(0, withIndex).trim();
  const after = phrase.slice(withIndex + 4).trim();
  if (before && after && matchFoodEntry(after.toLowerCase())) {
    return [before, after];
  }
  return [phrase];
}

function buildFallbackItem(phrase: string): FoodItemExtraction {
  const lower = phrase.toLowerCase();

  if (/\bsame\b/.test(lower) && (/breakfast|lunch|dinner|meal/.test(lower) || /yesterday/.test(lower))) {
    return {
      name: 'previous meal',
      quantity: 1,
      unit: 'serving',
      confidence: 0.1,
      descriptors: [phrase.trim()],
    };
  }

  if (/\b(breakfast|lunch|dinner|snack)\b/.test(lower)) {
    return {
      name: 'meal',
      quantity: 1,
      unit: 'serving',
      confidence: 0.15,
      descriptors: [phrase.trim()],
    };
  }

  const { descriptors } = parseDescriptors(phrase);
  return {
    name: phrase.trim() || 'food',
    quantity: 1,
    unit: 'serving',
    confidence: 0.2,
    descriptors: descriptors.length ? descriptors : undefined,
  };
}

function buildItem(phrase: string): FoodItemExtraction {
  const lower = phrase.toLowerCase();
  const match = matchFoodEntry(lower);
  if (!match) {
    return buildFallbackItem(phrase);
  }

  const { entry } = match;
  const { preparationMethod, spiceLevel, descriptors } = parseDescriptors(phrase);
  const qty = parseQuantity(phrase);
  const unit = qty.unit ?? entry.defaultUnit;
  const isVagueQuantity = !qty.explicit;

  const confidence = entry.isGeneric
    ? isVagueQuantity
      ? 0.25
      : 0.55
    : isVagueQuantity
      ? 0.6
      : 0.9;

  return {
    name: entry.canonicalName,
    quantity: qty.quantity,
    unit,
    estimatedWeightGrams: qty.estimatedWeightGrams,
    preparationMethod,
    spiceLevel,
    confidence,
    descriptors: descriptors.length ? descriptors : undefined,
  };
}

/**
 * Rule-based keyword/quantity parser standing in for a real LLM. Deliberately
 * tuned to hit all three confidence tiers (spec section 11) — exact food +
 * explicit quantity -> high, generic food name ("curry") with a quantity ->
 * medium, generic food with a vague quantity ("some curry") -> low — over the
 * bounded vocabulary in food-table.ts. Never invents macros itself; it only
 * identifies items, NutritionService supplies the numbers.
 */
export class MockAIProvider implements AIProvider {
  async extractHealthEvents({
    text,
    nowISO,
  }: {
    text: string;
    nowISO: string;
  }): Promise<HealthExtractionResult> {
    const { iso: timestamp } = resolveTimestamp(text, nowISO);

    // An utterance is either about an activity or about food — checked first
    // since activity keywords ("walked", "played badminton") don't overlap
    // with the food vocabulary, so this never misclassifies a food mention.
    const exercise = tryParseExercise(text);
    if (exercise) {
      return {
        events: [
          {
            type: 'exercise',
            timestamp,
            activityType: exercise.activityType,
            durationMinutes: exercise.durationMinutes,
            steps: exercise.steps,
            distanceKm: exercise.distanceKm,
            intensity: exercise.intensity,
            confidence: exercise.confidence,
          },
        ],
      };
    }

    const { hour } = resolveTimestamp(text, nowISO);
    const mealType = inferMealType(text, hour);
    const phrases = splitIntoItemPhrases(text).flatMap(splitOnWithIfFood);

    const items = phrases.length > 0 ? phrases.map(buildItem) : [buildFallbackItem(text)];

    return {
      events: [{ type: 'food', timestamp, mealType, items }],
    };
  }

  async coachChat({
    messages,
    context,
  }: {
    messages: CoachChatMessage[];
    context: CoachContextInput;
  }): Promise<string> {
    return mockCoachReply(messages, context);
  }
}
