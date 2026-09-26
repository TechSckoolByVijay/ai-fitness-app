import type { NutritionEstimate } from '@fitness-app/shared';
import {
  calorieSliderBounds,
  proteinSliderBounds,
  scaleNutritionForQuantity,
  scaleNutritionToCalories,
  setNutritionProtein,
} from './nutritionOverride';

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

describe('protein corrections', () => {
  const dal: NutritionEstimate = {
    calories: 200,
    proteinG: 10,
    carbsG: 30,
    fatG: 5,
    fiberG: 4,
    isEstimate: true,
    source: 'usda',
  };

  it('sets protein without touching calories, and remembers the original estimate', () => {
    const next = setNutritionProtein(dal, 22);
    expect(next.proteinG).toBe(22);
    expect(next.calories).toBe(200);
    expect(next.proteinSetByUser).toBe(true);
    expect(next.estimatedProteinG).toBe(10);
    expect(next.estimatedCalories).toBe(200);
    expect(next.source).toBe('user_edited');
  });

  it('keeps hand-set protein when calories are corrected afterwards', () => {
    const next = scaleNutritionToCalories(setNutritionProtein(dal, 22), 300);
    expect(next.proteinG).toBe(22);
    expect(next.carbsG).toBe(45);
  });

  it('still rescales protein with calories when protein was never set', () => {
    expect(scaleNutritionToCalories(dal, 300).proteinG).toBe(15);
  });

  it('keeps the first estimate across several edits', () => {
    const once = scaleNutritionToCalories(dal, 300);
    const twice = scaleNutritionToCalories(once, 250);
    expect(twice.estimatedCalories).toBe(200);
  });

  it('scales hand-set protein and the estimate when quantity changes', () => {
    const next = scaleNutritionForQuantity(setNutritionProtein(dal, 22), 2);
    expect(next.proteinG).toBe(44);
    expect(next.estimatedProteinG).toBe(20);
    expect(next.proteinSetByUser).toBe(true);
  });
});

describe('proteinSliderBounds', () => {
  it('spans half to double the estimate', () => {
    expect(proteinSliderBounds(20)).toEqual({ min: 10, max: 40 });
  });

  it('leaves room to move for low-protein foods', () => {
    const { min, max } = proteinSliderBounds(1);
    expect(min).toBe(1);
    expect(max).toBeGreaterThanOrEqual(10);
  });
});
