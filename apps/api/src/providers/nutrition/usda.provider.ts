import type { NutritionEstimate } from '@fitness-app/shared';
import type { Per100g } from './food-table';
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
 * FDC's relevance ranking for a bare query surfaces dishes that merely
 * mention the food ahead of the plain food itself — "Croissants, apple"
 * over "Apples, ... raw"; "Flour, almond" over "Nuts, almonds ... raw" —
 * because USDA names generic foods "Category, variety, ..., raw" (comma
 * after the category, not the query word first).
 *
 * So: split each description on commas/whitespace (not all punctuation —
 * a hyphenated compound like "Rose-apples" must stay one token, or it
 * would wrongly match a query of "apple") and look for a token that is the
 * query (or its simple plural). Prefer a match whose description also says
 * "raw" — the closest thing to "the plain food" FDC has — before falling
 * back to a starts-with match, then a same-word match, then relevance rank.
 */
function pickBestMatch(foods: FdcFood[], query: string): FdcFood | undefined {
  const q = query.trim().toLowerCase();
  const tokenize = (s: string) => s.toLowerCase().split(/[,\s]+/).filter(Boolean);
  const hasQueryWord = (f: FdcFood) => tokenize(f.description).some((w) => w.startsWith(q) || q.startsWith(w));

  const rawMatch = foods.find((f) => hasQueryWord(f) && /\braw\b/i.test(f.description));
  if (rawMatch) return rawMatch;

  const startsWithMatch = foods.find((f) => f.description.toLowerCase().startsWith(q));
  if (startsWithMatch) return startsWithMatch;

  const wordMatches = foods.filter(hasQueryWord);
  if (wordMatches.length > 0) {
    return wordMatches.reduce((shortest, f) => (f.description.length < shortest.description.length ? f : shortest));
  }

  return foods[0];
}

function resolveGrams(quantity: number, unit: string, estimatedWeightGrams?: number): number {
  if (estimatedWeightGrams) return estimatedWeightGrams;
  const normalizedUnit = unit.toLowerCase();
  if (['g', 'gram', 'grams'].includes(normalizedUnit)) return quantity;
  if (normalizedUnit === 'kg') return quantity * 1000;
  // Unlike the mock table, arbitrary USDA foods have no curated
  // gramsPerUnit map for "whole"/"cup"/etc — a generic serving-size
  // assumption is the best available fallback for non-gram units.
  return quantity * 100;
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
    const per100g = await this.fetchPer100g(input.name);
    const adjusted = applyPreparationAdjustment(per100g, input.preparationMethod);
    const grams = resolveGrams(input.quantity, input.unit, input.estimatedWeightGrams);
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
      source: per100g === FALLBACK_PER_100G ? 'mock' : 'usda',
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
