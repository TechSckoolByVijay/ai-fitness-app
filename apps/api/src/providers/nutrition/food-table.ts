/**
 * Small hardcoded mock nutrition table (spec section 12/44 — MOCK_NUTRITION).
 * Values are illustrative estimates, not clinically verified, covering the
 * foods named in the spec's own examples and demo seed data. This is the
 * single source of truth for "known food vocabulary" shared by the mock
 * AIProvider (name recognition) and MockNutritionProvider (macro lookup).
 */
export interface Per100g {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG?: number;
  sodiumMg?: number;
}

export interface FoodTableEntry {
  canonicalName: string;
  aliases: string[];
  /** true when the name alone is ambiguous and needs a type/preparation to be logged confidently */
  isGeneric?: boolean;
  genericOptions?: string[];
  defaultUnit: string;
  /** grams represented by one unit of a given unit string */
  gramsPerUnit: Record<string, number>;
  per100g: Per100g;
}

export const FOOD_TABLE: FoodTableEntry[] = [
  {
    canonicalName: 'banana',
    aliases: ['banana', 'bananas'],
    defaultUnit: 'whole',
    gramsPerUnit: { whole: 118, medium: 118, small: 100, large: 140 },
    per100g: { calories: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3, fiberG: 2.6, sugarG: 12.2 },
  },
  {
    canonicalName: 'chapati',
    aliases: ['chapati', 'chapatis', 'roti', 'rotis'],
    defaultUnit: 'medium',
    gramsPerUnit: { medium: 40, small: 30, large: 50 },
    per100g: { calories: 297, proteinG: 11, carbsG: 58, fatG: 4, fiberG: 10, sodiumMg: 400 },
  },
  {
    // Indian "curd" is dahi — plain set yoghurt. USDA has no "dahi" at all,
    // and its "curd" means cheese curds: a search for it returns "Soybean,
    // curd cheese" (tofu, 151 kcal/100g) as the shortest full-word match,
    // which priced 200ml of dahi at 302 kcal instead of ~120. Bare
    // "yogurt"/"yoghurt" are deliberately NOT aliases — USDA resolves
    // "greek yogurt" correctly on its own, and it is a different food
    // (~10g protein per 100g, not 3.5).
    canonicalName: 'curd',
    aliases: ['curd', 'dahi', 'plain curd', 'plain dahi', 'plain yogurt', 'plain yoghurt', 'set curd'],
    defaultUnit: 'bowl',
    gramsPerUnit: { bowl: 150, cup: 245, glass: 250, tablespoon: 15, g: 1, ml: 1 },
    // USDA "Yogurt, plain, whole milk" — dahi is normally set from full-cream milk.
    per100g: { calories: 61, proteinG: 3.5, carbsG: 4.7, fatG: 3.3, fiberG: 0, sugarG: 4.7, sodiumMg: 46 },
  },
  {
    canonicalName: 'dal',
    aliases: ['dal', 'daal', 'lentils', 'lentil curry'],
    defaultUnit: 'bowl',
    gramsPerUnit: { bowl: 150, cup: 200, g: 1 },
    per100g: { calories: 116, proteinG: 9, carbsG: 20, fatG: 0.4, fiberG: 8, sodiumMg: 300 },
  },
  {
    canonicalName: 'paneer curry',
    aliases: ['paneer curry', 'paneer'],
    defaultUnit: 'bowl',
    gramsPerUnit: { bowl: 150, g: 1 },
    per100g: { calories: 220, proteinG: 11, carbsG: 6, fatG: 17, fiberG: 1, sodiumMg: 450 },
  },
  {
    canonicalName: 'vegetable curry',
    aliases: ['vegetable curry', 'veg curry', 'mixed veg curry', 'sabzi'],
    defaultUnit: 'bowl',
    gramsPerUnit: { bowl: 150, g: 1 },
    per100g: { calories: 110, proteinG: 3, carbsG: 12, fatG: 6, fiberG: 3, sodiumMg: 380 },
  },
  {
    canonicalName: 'curry',
    aliases: ['curry', 'gravy'],
    isGeneric: true,
    genericOptions: ['Dal curry', 'Paneer curry', 'Vegetable curry', 'Other'],
    defaultUnit: 'bowl',
    gramsPerUnit: { bowl: 150, g: 1 },
    per100g: { calories: 150, proteinG: 6, carbsG: 12, fatG: 9, fiberG: 3, sodiumMg: 400 },
  },
  {
    canonicalName: 'rice',
    aliases: ['rice', 'steamed rice', 'white rice'],
    defaultUnit: 'bowl',
    gramsPerUnit: { bowl: 150, cup: 180, g: 1 },
    per100g: { calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, fiberG: 0.4 },
  },
  {
    canonicalName: 'salad',
    aliases: ['salad'],
    defaultUnit: 'bowl',
    gramsPerUnit: { bowl: 100, g: 1 },
    per100g: { calories: 20, proteinG: 1.2, carbsG: 4, fatG: 0.2, fiberG: 2 },
  },
  {
    canonicalName: 'tea',
    aliases: ['tea', 'chai'],
    defaultUnit: 'cup',
    gramsPerUnit: { cup: 150, glass: 200, ml: 1 },
    per100g: { calories: 30, proteinG: 0.8, carbsG: 4, fatG: 1, fiberG: 0, sugarG: 3 },
  },
  {
    canonicalName: 'coffee',
    aliases: ['coffee'],
    defaultUnit: 'cup',
    gramsPerUnit: { cup: 150, glass: 200, ml: 1 },
    per100g: { calories: 20, proteinG: 0.5, carbsG: 2, fatG: 0.8, fiberG: 0, sugarG: 1.5 },
  },
  {
    // The powder itself, distinct from a made-up shake. USDA's per-100g figure
    // for whey is right, but "1 scoop" was resolving to 100g rather than the
    // ~32g a scoop actually holds, tripling every logged serving.
    canonicalName: 'protein powder',
    aliases: ['protein powder', 'whey protein', 'whey', 'protein supplement'],
    defaultUnit: 'scoop',
    gramsPerUnit: { scoop: 32, tablespoon: 15, g: 1 },
    per100g: { calories: 390, proteinG: 78, carbsG: 8, fatG: 6, fiberG: 1, sodiumMg: 300 },
  },
  {
    canonicalName: 'protein shake',
    aliases: ['protein shake', 'protein shakes'],
    defaultUnit: 'glass',
    // A shake is mostly the liquid it is mixed into; a scoop is just the powder.
    gramsPerUnit: { glass: 300, cup: 250, ml: 1, scoop: 32 },
    per100g: { calories: 65, proteinG: 6, carbsG: 5, fatG: 2, fiberG: 0.5 },
  },
  {
    canonicalName: 'water',
    aliases: ['water', 'plain water', 'glass of water'],
    defaultUnit: 'glass',
    gramsPerUnit: { glass: 250, cup: 200, bottle: 500, liter: 1000, l: 1000, ml: 1 },
    per100g: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sodiumMg: 0 },
  },
  {
    canonicalName: 'sugar',
    aliases: ['sugar'],
    defaultUnit: 'teaspoon',
    gramsPerUnit: { teaspoon: 4, tablespoon: 12 },
    per100g: { calories: 387, proteinG: 0, carbsG: 100, fatG: 0, fiberG: 0, sugarG: 100 },
  },
];

/**
 * Whether `name` ENDS with `alias` on a word boundary.
 *
 * Anchored to the end because English and Hindi dish names put the head noun
 * last: "mixed vegetable sabzi" IS a sabzi, but "banana shake" is a shake,
 * not a banana. Matching an alias anywhere in the string prices a banana
 * shake as fruit — the same partial-overlap trap that once sent it to a
 * banana pepper.
 */
function endsWithAlias(name: string, alias: string): boolean {
  if (!name.endsWith(alias)) return false;
  const before = name.length === alias.length ? ' ' : name[name.length - alias.length - 1];
  return !/[a-z0-9]/.test(before);
}

/**
 * Resolves a food name to a curated entry.
 *
 * Exact match first, then a head-noun match, because the vision model names
 * dishes descriptively — "mixed vegetable sabzi", "plain steamed rice" — and
 * an exact-only lookup missed every one of them, dropping the meal through
 * to raw-ingredient values from USDA that carry no cooking oil.
 *
 * The longest alias wins, so "paneer curry" is not beaten by "curry".
 */
export function findFoodEntry(name: string): FoodTableEntry | undefined {
  const normalized = name.trim().toLowerCase();

  const exact = FOOD_TABLE.find(
    (entry) => entry.canonicalName === normalized || entry.aliases.includes(normalized),
  );
  if (exact) return exact;

  let best: { entry: FoodTableEntry; length: number } | undefined;
  for (const entry of FOOD_TABLE) {
    for (const alias of [entry.canonicalName, ...entry.aliases]) {
      if (endsWithAlias(normalized, alias) && (!best || alias.length > best.length)) {
        best = { entry, length: alias.length };
      }
    }
  }
  return best?.entry;
}
