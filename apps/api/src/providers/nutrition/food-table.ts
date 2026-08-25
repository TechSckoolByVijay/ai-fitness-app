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
    canonicalName: 'protein shake',
    aliases: ['protein shake', 'protein shakes'],
    defaultUnit: 'glass',
    gramsPerUnit: { glass: 300, cup: 250, ml: 1 },
    per100g: { calories: 65, proteinG: 6, carbsG: 5, fatG: 2, fiberG: 0.5 },
  },
  {
    canonicalName: 'sugar',
    aliases: ['sugar'],
    defaultUnit: 'teaspoon',
    gramsPerUnit: { teaspoon: 4, tablespoon: 12 },
    per100g: { calories: 387, proteinG: 0, carbsG: 100, fatG: 0, fiberG: 0, sugarG: 100 },
  },
];

export function findFoodEntry(name: string): FoodTableEntry | undefined {
  const normalized = name.trim().toLowerCase();
  return FOOD_TABLE.find(
    (entry) => entry.canonicalName === normalized || entry.aliases.includes(normalized),
  );
}
