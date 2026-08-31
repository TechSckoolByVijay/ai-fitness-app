import type { FoodTableEntry } from './food-table';

/**
 * Turning "200 ml of curd" into grams.
 *
 * This is the single most dangerous calculation in nutrition lookup, because
 * everything downstream multiplies by it. A logged meal once came back as
 * 30,200 kcal: the unit was "ml", which nothing recognised, so it fell
 * through to `quantity * 100` — reading "200" as *200 servings* of 100g each,
 * i.e. twenty kilograms of curd.
 *
 * The root mistake was treating one fallback as valid for two different kinds
 * of unit. `quantity` means completely different things depending on the unit:
 *
 *   a COUNT      "2 rotis", "1 bowl"   -> multiply by a per-unit weight
 *   a MEASURE    "200 ml", "150 g"     -> the quantity IS the amount
 *
 * Multiplying a measurement by a per-serving weight is how you get 20kg.
 */

/** Liquids this app deals with — water, milk, curd, tea, juice — are all near 1 g/ml. */
const ML_PER_GRAM = 1;

const GRAM_UNITS = new Set(['g', 'gram', 'grams', 'gm', 'gms']);
const KILOGRAM_UNITS = new Set(['kg', 'kgs', 'kilogram', 'kilograms']);
const MILLILITRE_UNITS = new Set(['ml', 'mls', 'millilitre', 'millilitres', 'milliliter', 'milliliters', 'cc']);
const LITRE_UNITS = new Set(['l', 'litre', 'litres', 'liter', 'liters']);
const OUNCE_UNITS = new Set(['oz', 'ounce', 'ounces']);
const POUND_UNITS = new Set(['lb', 'lbs', 'pound', 'pounds']);

/**
 * Household measures, used only when the food itself has no better figure.
 * Volume-to-weight varies with what is being measured — a cup of rice and a
 * cup of milk differ — but ~1 g/ml beats the flat 100g assumption these
 * previously fell through to by a wide margin.
 */
const APPROXIMATE_UNIT_GRAMS: Record<string, number> = {
  cup: 240,
  cups: 240,
  glass: 250,
  glasses: 250,
  tablespoon: 15,
  tablespoons: 15,
  tbsp: 15,
  teaspoon: 5,
  teaspoons: 5,
  tsp: 5,
};

/**
 * Container words whose weight genuinely varies from kitchen to kitchen. A
 * bowl of dal is 150g in one house and 400g in another, and no amount of
 * cleverness can tell which from the words alone — so the app asks instead
 * of guessing.
 *
 * Deliberately narrow. Most unit problems are missing conversions, not real
 * ambiguity: "half a pound" needs a conversion, not a question. Asking about
 * everything would make voice logging slower than typing, which is the whole
 * reason the app exists.
 */
const AMBIGUOUS_UNIT_SIZES: Record<string, { small: number; medium: number; large: number }> = {
  bowl: { small: 150, medium: 250, large: 400 },
  katori: { small: 100, medium: 150, large: 250 },
  plate: { small: 200, medium: 350, large: 500 },
  handful: { small: 20, medium: 30, large: 45 },
};

/** Whether this unit's weight is genuinely unknowable without asking. */
export function isAmbiguousUnit(unit: string): boolean {
  return normalizeUnit(unit) in AMBIGUOUS_UNIT_SIZES;
}

/** The size options to offer for an ambiguous unit, largest label first. */
export function sizeOptionsFor(unit: string): { label: string; grams: number }[] {
  const sizes = AMBIGUOUS_UNIT_SIZES[normalizeUnit(unit)];
  if (!sizes) return [];
  const normalized = normalizeUnit(unit);
  return [
    { label: `Small ${normalized}`, grams: sizes.small },
    { label: `Medium ${normalized}`, grams: sizes.medium },
    { label: `Large ${normalized}`, grams: sizes.large },
  ];
}

function normalizeUnit(unit: string): string {
  const trimmed = unit.trim().toLowerCase();
  // "bowls" and "2 bowls" both come through as the same container word.
  return trimmed.endsWith('s') && trimmed.length > 3 ? trimmed.slice(0, -1) : trimmed;
}

/**
 * No single logged food item is plausibly heavier than this. It is not a
 * nutritional judgement — it is a guard against a unit being misread, which
 * produces numbers wrong by orders of magnitude rather than by a bit. A meal
 * that really is 3kg will be understated; a meal misparsed as 20kg will not
 * silently destroy the day's total.
 */
export const MAX_PLAUSIBLE_GRAMS = 3000;

/** A serving-sized fallback when the unit conveys no weight at all. */
const ASSUMED_SERVING_GRAMS = 100;

export function resolveGrams(
  entry: FoodTableEntry | undefined,
  quantity: number,
  unit: string,
  estimatedWeightGrams?: number,
): number {
  const grams = resolveRawGrams(entry, quantity, unit, estimatedWeightGrams);
  // Clamp last, so every path is covered — including a model-supplied
  // estimatedWeightGrams, which is just as capable of being absurd.
  return Math.min(Math.max(grams, 0), MAX_PLAUSIBLE_GRAMS);
}

function resolveRawGrams(
  entry: FoodTableEntry | undefined,
  quantity: number,
  unit: string,
  estimatedWeightGrams?: number,
): number {
  if (estimatedWeightGrams && Number.isFinite(estimatedWeightGrams)) return estimatedWeightGrams;

  const normalized = unit.trim().toLowerCase();
  const amount = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

  // --- Units that ARE a measurement: the quantity is the amount itself. ---
  if (GRAM_UNITS.has(normalized)) return amount;
  if (KILOGRAM_UNITS.has(normalized)) return amount * 1000;
  if (MILLILITRE_UNITS.has(normalized)) return amount * ML_PER_GRAM;
  if (LITRE_UNITS.has(normalized)) return amount * 1000 * ML_PER_GRAM;
  if (OUNCE_UNITS.has(normalized)) return amount * 28.35;
  if (POUND_UNITS.has(normalized)) return amount * 453.592;

  // --- Units that are a COUNT. ---
  // The food's own figure wins over any generic one: the table knows a cup of
  // rice is 180g, which a blanket 240ml assumption would overwrite.
  const perUnit = entry?.gramsPerUnit[normalized];
  if (perUnit !== undefined) return perUnit * amount;

  const approximate = APPROXIMATE_UNIT_GRAMS[normalized];
  if (approximate !== undefined) return approximate * amount;

  const ambiguous = AMBIGUOUS_UNIT_SIZES[normalizeUnit(normalized)];
  if (ambiguous && !entry?.gramsPerUnit[normalized]) return ambiguous.medium * amount;

  if (entry) return (entry.gramsPerUnit[entry.defaultUnit] ?? ASSUMED_SERVING_GRAMS) * amount;

  return amount * ASSUMED_SERVING_GRAMS;
}
