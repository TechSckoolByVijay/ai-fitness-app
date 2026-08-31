import type { NutritionEstimate } from '@fitness-app/shared';
import { findFoodEntry, type Per100g } from './food-table';
import { resolveGrams } from './resolve-grams';
import { applyPreparationAdjustment, FALLBACK_PER_100G } from './nutrition-adjustments';
import type { NutritionLookupInput, NutritionService } from './nutrition-service.interface';

const FDC_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

interface FdcNutrient {
  nutrientName: string;
  unitName?: string;
  value: number;
}

interface FdcFood {
  description: string;
  foodNutrients: FdcNutrient[];
}

interface FdcSearchResponse {
  foods?: FdcFood[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * FDC lists "Energy" twice per food — once in KCAL, once in kJ, both under
 * the identical nutrientName "Energy" — so `unitName` must be checked too,
 * not just the name, or this can silently read the kJ figure as if it were
 * kcal (observed: a 100g apple read as 1060 "calories", which was actually
 * its kJ value).
 */
function findNutrientValue(nutrients: FdcNutrient[], namePattern: RegExp, unitName?: string): number | undefined {
  return nutrients.find(
    (n) => namePattern.test(n.nutrientName) && (!unitName || n.unitName?.toUpperCase() === unitName),
  )?.value;
}

/**
 * "Foundation" dataset foods (unlike SR Legacy) often don't report a plain
 * "Energy" nutrient at all — only "Energy (Atwater General Factors)" and
 * "Energy (Atwater Specific Factors)" (observed: almonds' Foundation entry
 * had neither plain "Energy", silently falling back to the generic 150 kcal
 * placeholder every time). Specific Factors are calculated from that food's
 * own measured macros, so they're preferred over the General (average-food)
 * factors when both are present.
 */
function findEnergyKcal(nutrients: FdcNutrient[]): number | undefined {
  return (
    findNutrientValue(nutrients, /^energy$/i, 'KCAL') ??
    findNutrientValue(nutrients, /energy \(atwater specific factors\)/i, 'KCAL') ??
    findNutrientValue(nutrients, /energy \(atwater general factors\)/i, 'KCAL')
  );
}

/** Foundation/SR Legacy foods report every nutrient per 100g, so no unit conversion is needed here. */
function extractPer100g(food: FdcFood): Per100g {
  const nutrients = food.foodNutrients;
  return {
    calories: findEnergyKcal(nutrients) ?? FALLBACK_PER_100G.calories,
    proteinG: findNutrientValue(nutrients, /^protein$/i) ?? FALLBACK_PER_100G.proteinG,
    carbsG: findNutrientValue(nutrients, /carbohydrate/i) ?? FALLBACK_PER_100G.carbsG,
    fatG: findNutrientValue(nutrients, /total lipid/i) ?? FALLBACK_PER_100G.fatG,
    fiberG: findNutrientValue(nutrients, /fiber/i) ?? FALLBACK_PER_100G.fiberG,
    sugarG: findNutrientValue(nutrients, /sugars/i),
    sodiumMg: findNutrientValue(nutrients, /sodium/i),
  };
}

/**
 * Two words match if they are equal, or differ only by a plural "s"/"es".
 *
 * Deliberately a comparison rather than a canonical stem: stemming "apples"
 * by stripping "es" yields "appl", which then fails to match "apple" — the
 * exact bug that made a query for "apple" skip every "Apples, ... raw" entry
 * and settle on "Strudel, apple".
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  for (const suffix of ['s', 'es']) {
    if (a === b + suffix || b === a + suffix) return true;
  }
  return false;
}

/** Split on commas/whitespace, NOT all punctuation — a hyphenated compound like "Rose-apples" must stay one token, or it would wrongly match a query of "apple". */
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[,\s]+/).filter(Boolean);
}

/**
 * FDC categories that are never what someone means when they log a meal.
 * "chicken curry" otherwise resolves to "Spices, curry powder" at 325
 * kcal/100g — a seasoning priced as if it were the dish.
 */
const NON_DISH_PREFIXES = ['spices', 'babyfood', 'leavening agents', 'gelatin desserts'];

function isNonDish(food: FdcFood): boolean {
  const description = food.description.toLowerCase();
  return NON_DISH_PREFIXES.some((prefix) => description.startsWith(prefix));
}

/**
 * FDC's relevance ranking for a bare query surfaces dishes that merely
 * mention the food ahead of the plain food itself — "Croissants, apple"
 * over "Apples, ... raw" — because USDA names generic foods
 * "Category, variety, ..., raw". So a bare relevance pick is not enough.
 *
 * Matching is strongest-first:
 *
 *  1. Every query word appears. Among those, prefer one saying "raw" — the
 *     closest thing FDC has to "the plain food".
 *  2. Otherwise the HEAD word appears. English and Hindi compound food names
 *     put the head noun last: a "banana shake" is a shake, an "aloo paratha"
 *     is a paratha. Matching the head keeps the result in the right food
 *     family. "raw" is NOT preferred here — for a prepared dish, a raw whole
 *     food is the wrong answer.
 *  3. Otherwise fall back to FDC's own relevance rank.
 *
 * A previous version matched on ANY single shared word and then preferred
 * "raw", which sent "banana shake" to "Pepper, banana, raw" — a banana
 * pepper, 27 kcal/100g. Partial word overlap must never outrank food family.
 */
function pickBestMatch(foods: FdcFood[], query: string): FdcFood | undefined {
  const queryWords = tokenize(query);
  if (queryWords.length === 0) return foods[0];

  const edible = foods.filter((f) => !isNonDish(f));
  const pool = edible.length > 0 ? edible : foods;

  const shortest = (candidates: FdcFood[]) =>
    candidates.reduce((best, f) => (f.description.length < best.description.length ? f : best));
  const describes = (f: FdcFood, word: string) => tokenize(f.description).some((t) => sameWord(t, word));
  const isRaw = (f: FdcFood) => /\braw\b/i.test(f.description);

  const fullMatches = pool.filter((f) => queryWords.every((w) => describes(f, w)));
  if (fullMatches.length > 0) {
    const raw = fullMatches.filter(isRaw);
    return shortest(raw.length > 0 ? raw : fullMatches);
  }

  const headWord = queryWords[queryWords.length - 1];
  const headMatches = pool.filter((f) => describes(f, headWord));
  if (headMatches.length > 0) return shortest(headMatches);

  return foods[0];
}


/**
 * Real nutrition provider backed by USDA FoodData Central's public search
 * API (https://fdc.nal.usda.gov) — covers hundreds of thousands of foods
 * versus the ~12-entry mock table, so foods like "apple" (not in the mock
 * table) resolve to real measured values instead of a generic placeholder.
 * Restricted to the Foundation and SR Legacy data types, which report
 * nutrients per 100g of raw/generic food (not per-branded-serving), so the
 * gram-based scaling below is on solid footing and results aren't polluted
 * by branded-product name matches (e.g. "Apple Jacks cereal").
 *
 * Never throws for "no match" or a transient API failure — falls back to
 * the same generic per-100g estimate the mock provider uses, so a USDA
 * hiccup degrades quality rather than breaking meal logging entirely.
 */
export class UsdaNutritionProvider implements NutritionService {
  constructor(private readonly apiKey: string) {}

  async lookup(input: NutritionLookupInput): Promise<NutritionEstimate> {
    // The curated table wins over USDA when it knows the food. USDA's
    // Foundation/SR Legacy sets contain almost no composite Indian dishes,
    // so a lookup for "chapati" or "dal" there matches something adjacent
    // and wrong; the table has measured values AND per-unit weights for
    // exactly those staples. USDA still covers everything else.
    const entry = findFoodEntry(input.name);
    const per100g = entry?.per100g ?? (await this.fetchPer100g(input.name));
    const adjusted = applyPreparationAdjustment(per100g, input.preparationMethod);
    const grams = resolveGrams(entry, input.quantity, input.unit, input.estimatedWeightGrams);
    const scale = grams / 100;

    return {
      calories: round1(adjusted.calories * scale),
      proteinG: round1(adjusted.proteinG * scale),
      carbsG: round1(adjusted.carbsG * scale),
      fatG: round1(adjusted.fatG * scale),
      fiberG: round1((adjusted.fiberG ?? 0) * scale),
      sugarG: adjusted.sugarG !== undefined ? round1(adjusted.sugarG * scale) : undefined,
      sodiumMg: adjusted.sodiumMg !== undefined ? round1(adjusted.sodiumMg * scale) : undefined,
      isEstimate: true,
      source: entry || per100g === FALLBACK_PER_100G ? 'mock' : 'usda',
    };
  }

  private async fetchPer100g(name: string): Promise<Per100g> {
    try {
      const url = new URL(FDC_SEARCH_URL);
      url.searchParams.set('api_key', this.apiKey);
      url.searchParams.set('query', name);
      url.searchParams.set('dataType', 'Foundation,SR Legacy');
      url.searchParams.set('pageSize', '10');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`USDA FoodData Central request failed: ${response.status} ${response.statusText}`);
      }

      const body = (await response.json()) as FdcSearchResponse;
      const food = body.foods && body.foods.length > 0 ? pickBestMatch(body.foods, name) : undefined;
      if (!food) {
        // eslint-disable-next-line no-console
        console.warn(`[UsdaNutritionProvider] No FoodData Central match for "${name}", using generic fallback.`);
        return FALLBACK_PER_100G;
      }

      return extractPer100g(food);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[UsdaNutritionProvider] Lookup failed for "${name}", using generic fallback.`, error);
      return FALLBACK_PER_100G;
    }
  }
}
