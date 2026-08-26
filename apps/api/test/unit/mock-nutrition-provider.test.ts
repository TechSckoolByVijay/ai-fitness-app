import { describe, expect, it } from 'vitest';
import { MockNutritionProvider } from '../../src/providers/nutrition/mock-nutrition.provider';

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
