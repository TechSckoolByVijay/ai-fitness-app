import { describe, expect, it } from 'vitest';
import {
  computeFrequentFoods,
  computeRemainingCalories,
  summarizeTodaysMeals,
} from '../../src/modules/coach/coach-context.service';

describe('computeFrequentFoods', () => {
  it('ranks food names by how often they appear, most frequent first', () => {
    const entries = [
      { mealType: 'breakfast', items: [{ name: 'banana' }, { name: 'chapati' }] },
      { mealType: 'lunch', items: [{ name: 'chapati' }, { name: 'dal' }] },
      { mealType: 'dinner', items: [{ name: 'chapati' }] },
    ];
    expect(computeFrequentFoods(entries)).toEqual(['chapati', 'banana', 'dal']);
  });

  it('is case-insensitive when counting', () => {
    const entries = [
      { mealType: 'breakfast', items: [{ name: 'Banana' }] },
      { mealType: 'snack', items: [{ name: 'banana' }] },
    ];
    expect(computeFrequentFoods(entries)).toEqual(['banana']);
  });

  it('caps the result at the given limit', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      mealType: 'snack',
      items: [{ name: `food-${i}` }],
    }));
    expect(computeFrequentFoods(entries, 3)).toHaveLength(3);
  });

  it('returns an empty array for no entries', () => {
    expect(computeFrequentFoods([])).toEqual([]);
  });
});

describe('summarizeTodaysMeals', () => {
  it('formats each entry as "mealType: item, item"', () => {
    const entries = [{ mealType: 'breakfast', items: [{ name: 'banana' }, { name: 'chapati' }] }];
    expect(summarizeTodaysMeals(entries)).toEqual(['breakfast: banana, chapati']);
  });

  it('falls back to "unspecified" for an entry with no items', () => {
    const entries = [{ mealType: 'snack', items: [] }];
    expect(summarizeTodaysMeals(entries)).toEqual(['snack: unspecified']);
  });
});

describe('computeRemainingCalories', () => {
  it('returns null when no calorie target is set', () => {
    expect(computeRemainingCalories(null, 500, 100)).toBeNull();
  });

  it('adds activity calories back to the remaining budget', () => {
    expect(computeRemainingCalories(2000, 1200, 300)).toBe(1100);
  });

  it('can go negative when the user has eaten past their target', () => {
    expect(computeRemainingCalories(1500, 1800, 0)).toBe(-300);
  });
});
