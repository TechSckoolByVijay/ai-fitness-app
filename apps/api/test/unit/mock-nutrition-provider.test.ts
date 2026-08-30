import { describe, expect, it } from 'vitest';
import { MockNutritionProvider } from '../../src/providers/nutrition/mock-nutrition.provider';
import { findFoodEntry } from '../../src/providers/nutrition/food-table';

describe('MockNutritionProvider', () => {
  const provider = new MockNutritionProvider();

  it('gives water zero calories instead of the generic fallback estimate', async () => {
    const result = await provider.lookup({ name: 'water', quantity: 1, unit: 'glass' });
    expect(result.calories).toBe(0);
    expect(result.proteinG).toBe(0);
    expect(result.carbsG).toBe(0);
    expect(result.fatG).toBe(0);
  });

  it('recognizes the "glass of water" alias the same way', async () => {
    const result = await provider.lookup({ name: 'glass of water', quantity: 1, unit: 'glass' });
    expect(result.calories).toBe(0);
  });

  it('still falls back to a generic estimate for a truly unknown food', async () => {
    const result = await provider.lookup({ name: 'some totally unknown dish', quantity: 100, unit: 'g' });
    expect(result.calories).toBe(150);
  });
});

/**
 * The vision model names dishes descriptively — "mixed vegetable sabzi",
 * not "sabzi". Exact-only lookup missed every one of those, dropping the
 * meal through to raw-ingredient values: a kadai of peas/tomato/capsicum
 * came back as 30 kcal, roughly a bowl of salad, because nothing carried
 * the cooking oil.
 */
describe('findFoodEntry with descriptive dish names', () => {
  it('matches an alias inside a longer dish name', () => {
    expect(findFoodEntry('mixed vegetable sabzi')?.canonicalName).toBe('vegetable curry');
    expect(findFoodEntry('homemade aloo paratha')).toBeUndefined();
    expect(findFoodEntry('plain steamed rice')?.canonicalName).toBe('rice');
  });

  it('prefers the most specific dish when several aliases appear', () => {
    // "curry" also matches, but "paneer curry" is the better answer.
    expect(findFoodEntry('restaurant style paneer curry')?.canonicalName).toBe('paneer curry');
  });

  it('still prefers an exact match over a contained one', () => {
    expect(findFoodEntry('curry')?.canonicalName).toBe('curry');
    expect(findFoodEntry('banana')?.canonicalName).toBe('banana');
  });

  it('respects word boundaries so a substring is not a match', () => {
    // "pea" must not match inside "peanut"; "rice" must not match "price".
    expect(findFoodEntry('peanut butter')).toBeUndefined();
    expect(findFoodEntry('priceless dish')).toBeUndefined();
  });

  it('matches the head noun only, so a banana shake is not a banana', () => {
    // The alias must end the name. Otherwise "banana shake" resolves to the
    // banana entry and a 300 kcal shake is priced as 105 kcal of fruit.
    expect(findFoodEntry('banana shake')).toBeUndefined();
    expect(findFoodEntry('mango lassi')).toBeUndefined();
  });

  it('prices a cooked sabzi far above its raw ingredients', () => {
    const sabzi = findFoodEntry('mixed vegetable sabzi');
    // Raw peas/tomato/capsicum land near 20-40 kcal/100g and carry no oil.
    expect(sabzi?.per100g.calories).toBeGreaterThan(90);
    expect(sabzi?.per100g.fatG).toBeGreaterThan(3);
  });
});
