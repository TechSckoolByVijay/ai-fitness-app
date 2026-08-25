import type { ConfidenceTier } from '@fitness-app/shared';

export const HIGH_CONFIDENCE_THRESHOLD = 0.8;
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Maps a 0-1 confidence score (reported by whichever AIProvider extracted
 * the item — mock or real) into the tiered behavior spec section 11
 * describes: high -> auto-log, medium -> editable estimate, low -> blocking
 * clarifying question. The extraction provider is responsible for
 * calibrating its score against ambiguity/genericness/quantity-explicitness
 * (see MockAIProvider); this function only applies the tier thresholds, so
 * it stays a pure, easily unit-tested boundary regardless of which provider
 * produced the score.
 */
export function classifyItemConfidence(aiConfidence: number): ConfidenceTier {
  if (aiConfidence >= HIGH_CONFIDENCE_THRESHOLD) return 'high';
  if (aiConfidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
  return 'low';
}

const TIER_RANK: Record<ConfidenceTier, number> = { low: 0, medium: 1, high: 2 };

/** Meal-level tier is worst-of across items — one low-confidence item forces the whole meal to clarify. */
export function classifyMealConfidence(itemTiers: ConfidenceTier[]): ConfidenceTier {
  if (itemTiers.length === 0) return 'low';
  return itemTiers.reduce((worst, tier) => (TIER_RANK[tier] < TIER_RANK[worst] ? tier : worst));
}

/** Never silently auto-log unless both the meal is high-confidence AND the user has opted in. */
export function shouldAutoLog(mealTier: ConfidenceTier, autoLogSetting: boolean): boolean {
  return mealTier === 'high' && autoLogSetting;
}
