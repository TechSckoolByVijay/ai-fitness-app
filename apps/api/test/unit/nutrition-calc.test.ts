import { sumNutrition } from '@fitness-app/shared';
import { describe, expect, it } from 'vitest';
import { MockNutritionProvider } from '../../src/providers/nutrition/mock-nutrition.provider';

describe('MockNutritionProvider.lookup', () => {
  const nutrition = new MockNutritionProvider();

  it('scales a known food by quantity for whole-unit foods (2 bananas = 2x macros of 1)', async () => {
    const one = await nutrition.lookup({ name: 'banana', quantity: 1, unit: 'whole' });
    const two = await nutrition.lookup({ name: 'banana', quantity: 2, unit: 'whole' });
    expect(two.calories).toBeCloseTo(one.calories * 2, 1);
    expect(two.proteinG).toBeCloseTo(one.proteinG * 2, 1);
  });

  it('resolves gram-based quantities directly as grams (200g dal)', async () => {
    const result = await nutrition.lookup({ name: 'dal', quantity: 200, unit: 'g' });
    // dal per100g: 116 kcal -> 200g = 232 kcal
    expect(result.calories).toBeCloseTo(232, 0);
  });

  it('reduces fat/calories for a "less_oily" preparation', async () => {
    const normal = await nutrition.lookup({ name: 'paneer curry', quantity: 200, unit: 'g' });
    const lessOily = await nutrition.lookup({
      name: 'paneer curry',
      quantity: 200,
      unit: 'g',
      preparationMethod: 'less_oily',
    });
    expect(lessOily.fatG).toBeLessThan(normal.fatG);
    expect(lessOily.calories).toBeLessThan(normal.calories);
  });

  it('increases fat/calories for a "more_oily" preparation', async () => {
    const normal = await nutrition.lookup({ name: 'paneer curry', quantity: 200, unit: 'g' });
    const moreOily = await nutrition.lookup({
      name: 'paneer curry',
      quantity: 200,
      unit: 'g',
      preparationMethod: 'more_oily',
    });
    expect(moreOily.fatG).toBeGreaterThan(normal.fatG);
  });

  it('falls back to a generic estimate for an unknown food rather than throwing', async () => {
    const result = await nutrition.lookup({ name: 'a totally unknown dish', quantity: 1, unit: 'serving' });
    expect(result.calories).toBeGreaterThan(0);
    expect(result.isEstimate).toBe(true);
    expect(result.source).toBe('mock');
  });

  it('always marks results as estimates, never precise', async () => {
    const result = await nutrition.lookup({ name: 'banana', quantity: 1, unit: 'whole' });
    expect(result.isEstimate).toBe(true);
  });
});

describe('sumNutrition', () => {
  it('sums macros across multiple items', () => {
    const total = sumNutrition([
      { calories: 100, proteinG: 5, carbsG: 10, fatG: 2, fiberG: 1, isEstimate: true, source: 'mock' },
      { calories: 50, proteinG: 2, carbsG: 5, fatG: 1, fiberG: 0.5, isEstimate: true, source: 'mock' },
    ]);
    expect(total.calories).toBe(150);
    expect(total.proteinG).toBe(7);
    expect(total.carbsG).toBe(15);
    expect(total.fatG).toBe(3);
    expect(total.fiberG).toBe(1.5);
  });

  it('returns all-zero totals for an empty item list', () => {
    const total = sumNutrition([]);
    expect(total.calories).toBe(0);
    expect(total.proteinG).toBe(0);
  });
});
