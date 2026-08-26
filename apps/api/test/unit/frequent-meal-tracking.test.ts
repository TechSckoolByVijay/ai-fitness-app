import { describe, expect, it } from 'vitest';
import { buildDisplayName, computeMealSignature } from '../../src/modules/food/frequent-meal-tracking';

describe('computeMealSignature', () => {
  it('is the same regardless of item order', () => {
    const a = computeMealSignature('breakfast', [{ name: 'Chapati' }, { name: 'Dal' }]);
    const b = computeMealSignature('breakfast', [{ name: 'dal' }, { name: 'chapati' }]);
    expect(a).toBe(b);
  });

  it('is case-insensitive and trims whitespace', () => {
    const a = computeMealSignature('lunch', [{ name: '  Banana ' }]);
    const b = computeMealSignature('lunch', [{ name: 'banana' }]);
    expect(a).toBe(b);
  });

  it('differs by mealType even with the same items', () => {
    const breakfast = computeMealSignature('breakfast', [{ name: 'banana' }]);
    const snack = computeMealSignature('snack', [{ name: 'banana' }]);
    expect(breakfast).not.toBe(snack);
  });

  it('differs when the set of items differs', () => {
    const a = computeMealSignature('lunch', [{ name: 'chapati' }, { name: 'dal' }]);
    const b = computeMealSignature('lunch', [{ name: 'chapati' }, { name: 'dal' }, { name: 'salad' }]);
    expect(a).not.toBe(b);
  });
});

describe('buildDisplayName', () => {
  it('joins item names with a comma', () => {
    expect(buildDisplayName([{ name: 'chapati' }, { name: 'dal' }])).toBe('chapati, dal');
  });

  it('truncates to 80 characters', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ name: `ingredient-${i}` }));
    expect(buildDisplayName(items).length).toBeLessThanOrEqual(80);
  });
});
