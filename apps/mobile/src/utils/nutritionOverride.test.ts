import type { NutritionEstimate } from '@fitness-app/shared';
import { calorieSliderBounds, scaleNutritionToCalories } from './nutritionOverride';

describe('calorieSliderBounds', () => {
  it('gives a narrow range around the estimate (0.6x-1.5x), not a wide-open one', () => {
    const { min, max } = calorieSliderBounds(100);
    expect(min).toBe(60);
    expect(max).toBe(150);
  });

  it('lets a genuinely zero-calorie item (e.g. water) actually reach 0', () => {
    const { min, max } = calorieSliderBounds(0);
    expect(min).toBe(0);
    expect(max).toBeGreaterThan(0);
  });

  it('never lets min go negative for very small estimates', () => {
    const { min } = calorieSliderBounds(2);
    expect(min).toBeGreaterThanOrEqual(0);
  });

  it('always keeps max meaningfully above min', () => {
    const { min, max } = calorieSliderBounds(10);
    expect(max).toBeGreaterThan(min);
  });
});

describe('scaleNutritionToCalories', () => {
  const base: NutritionEstimate = {
    calories: 100,
    proteinG: 10,
    carbsG: 20,
    fatG: 4,
    fiberG: 2,
    sugarG: 5,
    sodiumMg: 50,
    isEstimate: true,
    source: 'mock',
  };

  it('scales every macro proportionally to the new calorie value', () => {
    const result = scaleNutritionToCalories(base, 200);
    expect(result.calories).toBe(200);
    expect(result.proteinG).toBe(20);
    expect(result.carbsG).toBe(40);
    expect(result.fatG).toBe(8);
    expect(result.fiberG).toBe(4);
    expect(result.sugarG).toBe(10);
    expect(result.sodiumMg).toBe(100);
  });

  it('marks the result as user_edited, not the original source', () => {
    const result = scaleNutritionToCalories(base, 150);
    expect(result.source).toBe('user_edited');
    expect(result.isEstimate).toBe(true);
  });

  it('scales down correctly too', () => {
    const result = scaleNutritionToCalories(base, 50);
    expect(result.proteinG).toBe(5);
  });

  it('handles a zero-calorie starting point without dividing by zero', () => {
    const zero: NutritionEstimate = { ...base, calories: 0 };
    const result = scaleNutritionToCalories(zero, 80);
    expect(result.calories).toBe(80);
    expect(Number.isFinite(result.proteinG)).toBe(true);
  });
});
