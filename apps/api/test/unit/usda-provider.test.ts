import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsdaNutritionProvider } from '../../src/providers/nutrition/usda.provider';

function fdcResponse(overrides: Partial<Record<string, number>> = {}, description = 'Apples, raw, with skin') {
  return {
    foods: [
      {
        description,
        foodNutrients: [
          // FDC lists Energy twice — kJ appears first in real responses,
          // which is exactly the ordering that previously fooled a
          // name-only lookup into reading the kJ figure as kcal.
          { nutrientName: 'Energy', unitName: 'kJ', value: (overrides.calories ?? 52) * 4.184 },
          { nutrientName: 'Energy', unitName: 'KCAL', value: overrides.calories ?? 52 },
          { nutrientName: 'Protein', unitName: 'G', value: overrides.protein ?? 0.26 },
          { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: overrides.carbs ?? 13.8 },
          { nutrientName: 'Total lipid (fat)', unitName: 'G', value: overrides.fat ?? 0.17 },
          { nutrientName: 'Fiber, total dietary', unitName: 'G', value: overrides.fiber ?? 2.4 },
          { nutrientName: 'Sugars, total including NLEA', unitName: 'G', value: overrides.sugar ?? 10.4 },
          { nutrientName: 'Sodium, Na', unitName: 'MG', value: overrides.sodium ?? 1 },
        ],
      },
    ],
  };
}

describe('UsdaNutritionProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('parses a real-shaped FDC response and scales it to the requested grams', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => fdcResponse(),
    });

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'apple', quantity: 150, unit: 'g' });

    expect(result.source).toBe('usda');
    expect(result.calories).toBeCloseTo(78, 0);
    expect(result.proteinG).toBeCloseTo(0.39, 1);
    expect(result.fiberG).toBeCloseTo(3.6, 1);
  });

  it('sends the query, api key, and Foundation/SR Legacy filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fdcResponse() });
    global.fetch = fetchMock;

    const provider = new UsdaNutritionProvider('my-key');
    await provider.lookup({ name: 'apple', quantity: 100, unit: 'g' });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get('api_key')).toBe('my-key');
    expect(calledUrl.searchParams.get('query')).toBe('apple');
    expect(calledUrl.searchParams.get('dataType')).toBe('Foundation,SR Legacy');
    // Fetches multiple candidates (not just the top relevance hit) so a
    // plain-food match can be preferred over a prepared-dish false match.
    expect(calledUrl.searchParams.get('pageSize')).toBe('10');
  });

  it('reads the KCAL-unit Energy value, not the kJ one listed under the same nutrient name', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => fdcResponse({ calories: 52 }),
    });

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'apple', quantity: 100, unit: 'g' });

    expect(result.calories).toBe(52);
  });

  it('prefers a result whose description starts with the query over an earlier-ranked prepared dish', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        foods: [
          fdcResponse({ calories: 254 }, 'Croissants, apple').foods[0],
          fdcResponse({ calories: 52 }, 'Apples, raw, with skin').foods[0],
        ],
      }),
    });

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'apple', quantity: 100, unit: 'g' });

    expect(result.calories).toBe(52);
  });

  it('falls back to the top relevance-ranked result when nothing starts with the query', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        foods: [
          fdcResponse({ calories: 90 }, 'Fruit salad, apple and orange').foods[0],
          fdcResponse({ calories: 52 }, 'Mixed berry compote with apple').foods[0],
        ],
      }),
    });

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'apple', quantity: 100, unit: 'g' });

    expect(result.calories).toBe(90);
  });

  it('reads Energy (Atwater Specific Factors) when a Foundation food has no plain Energy field', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        foods: [
          {
            description: 'Nuts, almonds, whole, raw',
            foodNutrients: [
              { nutrientName: 'Energy (Atwater General Factors)', unitName: 'KCAL', value: 622 },
              { nutrientName: 'Energy (Atwater Specific Factors)', unitName: 'KCAL', value: 578 },
              { nutrientName: 'Protein', unitName: 'G', value: 21 },
              { nutrientName: 'Total lipid (fat)', unitName: 'G', value: 50 },
              { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 22 },
            ],
          },
        ],
      }),
    });

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'almonds', quantity: 30, unit: 'g' });

    // 578 kcal/100g (Specific Factors), not 622 (General) and not the 150
    // generic fallback that a missing-plain-"Energy" lookup used to produce.
    expect(result.calories).toBeCloseTo(578 * 0.3, 0);
  });

  it('prefers a plain generic food ("Nuts, almonds ... raw") over a category-first prepared one ("Flour, almond")', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        foods: [
          fdcResponse({ calories: 640 }, 'Flour, almond').foods[0],
          fdcResponse({ calories: 578 }, 'Nuts, almonds, whole, raw').foods[0],
        ],
      }),
    });

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'almonds', quantity: 100, unit: 'g' });

    expect(result.calories).toBe(578);
  });

  it('does not let a hyphenated compound word (Rose-apples) falsely match a plain "apple" query', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        foods: [
          fdcResponse({ calories: 25 }, 'Rose-apples, raw').foods[0],
          fdcResponse({ calories: 52 }, 'Apples, fuji, with skin, raw').foods[0],
        ],
      }),
    });

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'apple', quantity: 100, unit: 'g' });

    expect(result.calories).toBe(52);
  });

  it('falls back to a generic estimate (not an error) when nothing matches', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ foods: [] }),
    });

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'some totally unknown dish', quantity: 100, unit: 'g' });

    expect(result.source).toBe('mock');
    expect(result.calories).toBe(150);
  });

  it('falls back to a generic estimate (not a thrown error) on a network failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'apple', quantity: 100, unit: 'g' });

    expect(result.source).toBe('mock');
  });

  it('falls back to a generic estimate on a non-2xx response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'apple', quantity: 100, unit: 'g' });

    expect(result.source).toBe('mock');
  });

  it('uses estimatedWeightGrams over the raw quantity when provided', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => fdcResponse(),
    });

    const provider = new UsdaNutritionProvider('test-key');
    const result = await provider.lookup({ name: 'apple', quantity: 1, unit: 'whole', estimatedWeightGrams: 200 });

    expect(result.calories).toBeCloseTo(104, 0);
  });

  it('applies the less_oily preparation adjustment on top of the fetched values', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => fdcResponse({ fat: 10, calories: 100 }),
    });

    const provider = new UsdaNutritionProvider('test-key');
    const normal = await provider.lookup({ name: 'apple', quantity: 100, unit: 'g' });
    const lessOily = await provider.lookup({
      name: 'apple',
      quantity: 100,
      unit: 'g',
      preparationMethod: 'less_oily',
    });

    expect(lessOily.fatG).toBeLessThan(normal.fatG);
    expect(lessOily.calories).toBeLessThan(normal.calories);
  });
});

/**
 * Real descriptions and kcal values captured from FoodData Central, so these
 * pin behaviour against what USDA actually returns rather than a tidied-up
 * fixture. A user logging "one serving of banana shake" saw 27 kcal.
 */
function fdcFoods(entries: [string, number][]) {
  return {
    foods: entries.map(([description, calories]) => ({
      description,
      foodNutrients: [
        { nutrientName: 'Energy', unitName: 'KCAL', value: calories },
        { nutrientName: 'Protein', unitName: 'G', value: 1 },
        { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 1 },
        { nutrientName: 'Total lipid (fat)', unitName: 'G', value: 1 },
      ],
    })),
  };
}

describe('UsdaNutritionProvider food matching', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const mock = (entries: [string, number][]) =>
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => fdcFoods(entries) });

  // Exactly the FDC response for "banana shake".
  const BANANA_SHAKE_RESULTS: [string, number][] = [
    ['Bananas, dehydrated, or banana powder', 346],
    ['BURGER KING, Vanilla Shake', 168],
    ['Milk shakes, thick chocolate', 119],
    ['Milk shakes, thick vanilla', 112],
    ['Shake, fast food, vanilla', 148],
    ['Pepper, banana, raw', 27],
  ];

  it('does not price a banana shake as a banana pepper', async () => {
    mock(BANANA_SHAKE_RESULTS);
    const provider = new UsdaNutritionProvider('test-key');

    const result = await provider.lookup({ name: 'banana shake', quantity: 1, unit: 'serving' });

    // "Pepper, banana, raw" shares one word and says "raw", which the old
    // matcher treated as the best possible signal. 27 kcal for a shake.
    expect(result.calories).not.toBeCloseTo(27, 0);
    expect(result.calories).toBeGreaterThan(100);
  });

  it('matches a compound food on its head noun, so a shake resolves to a shake', async () => {
    mock(BANANA_SHAKE_RESULTS);
    const provider = new UsdaNutritionProvider('test-key');

    // 100g serving of "Shake, fast food, vanilla" (148/100g).
    const result = await provider.lookup({ name: 'banana shake', quantity: 1, unit: 'serving' });
    expect(result.calories).toBe(148);
  });

  it('still prefers the plain raw food for a single-word query', async () => {
    // Real FDC response for "apple": raw apples rank below prepared dishes.
    mock([
      ['Croissants, apple', 254],
      ['Strudel, apple', 274],
      ['Babyfood, juice, apple', 47],
      ['Rose-apples, raw', 25],
      ['Apples, dried, sulfured, uncooked', 243],
      ['Apples, raw, without skin', 48],
    ]);
    const provider = new UsdaNutritionProvider('test-key');

    const result = await provider.lookup({ name: 'apple', quantity: 100, unit: 'g' });
    // Regression guard: stemming "apples" to "appl" made this miss every
    // raw apple entry and settle on "Strudel, apple" at 274.
    expect(result.calories).toBe(48);
  });

  it('does not match a hyphenated compound (Rose-apples) for an apple query', async () => {
    mock([
      ['Rose-apples, raw', 25],
      ['Apples, raw, without skin', 48],
    ]);
    const provider = new UsdaNutritionProvider('test-key');

    const result = await provider.lookup({ name: 'apple', quantity: 100, unit: 'g' });
    expect(result.calories).toBe(48);
  });

  it('skips seasoning entries, so a curry is not priced as curry powder', async () => {
    mock([
      ['Spices, curry powder', 325],
      ['SMART SOUP, Thai Coconut Curry', 36],
    ]);
    const provider = new UsdaNutritionProvider('test-key');

    const result = await provider.lookup({ name: 'chicken curry', quantity: 100, unit: 'g' });
    expect(result.calories).not.toBe(325);
  });

  it('uses the curated table for Indian staples instead of a USDA near-miss', async () => {
    // Whatever USDA would return is irrelevant: the table has chapati.
    mock([['Bread, naan, plain, commercially prepared, refrigerated', 291]]);
    const provider = new UsdaNutritionProvider('test-key');

    const result = await provider.lookup({ name: 'chapati', quantity: 2, unit: 'medium' });

    // Table: 297 kcal/100g, 40g per medium chapati -> 2 x 40g = 80g.
    expect(result.calories).toBe(237.6);
    expect(result.source).toBe('mock');
    // The table answered, so no USDA call was needed at all.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('prices curd as dahi, not as the tofu USDA returns for "curd"', async () => {
    // The real FDC response for "curd": every candidate contains the word,
    // none says "raw", so the shortest description won — tofu at 151.
    mock([
      ['Soybean, curd cheese', 151],
      ['Cheese, cottage, creamed, large or small curd', 98],
    ]);
    const provider = new UsdaNutritionProvider('test-key');

    const result = await provider.lookup({ name: 'curd', quantity: 200, unit: 'ml' });

    // 61 kcal/100g x 200g. The USDA path gave 302.
    expect(result.calories).toBe(122);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('prices dahi, which USDA does not know at all, from the table', async () => {
    mock([]);
    const provider = new UsdaNutritionProvider('test-key');

    const result = await provider.lookup({ name: 'dahi', quantity: 200, unit: 'ml' });

    expect(result.calories).toBe(122);
    expect(result.proteinG).toBe(7);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('leaves greek yogurt to USDA rather than pricing it as plain curd', async () => {
    mock([['Yogurt, Greek, plain, lowfat', 73]]);
    const provider = new UsdaNutritionProvider('test-key');

    const result = await provider.lookup({ name: 'greek yogurt', quantity: 200, unit: 'g' });

    expect(result.calories).toBe(146);
    expect(result.source).toBe('usda');
  });

  it('gives a curated food a real per-unit weight rather than assuming 100g', async () => {
    mock([['Bananas, raw', 89]]);
    const provider = new UsdaNutritionProvider('test-key');

    const result = await provider.lookup({ name: 'banana', quantity: 1, unit: 'whole' });
    // 118g per whole banana at 89 kcal/100g. The USDA path would have
    // assumed a flat 100g and reported 89.
    expect(result.calories).toBe(105);
  });
});
