import { describe, expect, it } from 'vitest';
import { findFoodEntry } from '../../src/providers/nutrition/food-table';
import {
  isAmbiguousUnit,
  MAX_PLAUSIBLE_GRAMS,
  resolveGrams,
  sizeOptionsFor,
} from '../../src/providers/nutrition/resolve-grams';

describe('resolveGrams', () => {
  describe('units that ARE a measurement', () => {
    it('reads millilitres as the amount, not as a count of servings', () => {
      // The bug: "ml" was unrecognised, so 200ml fell through to
      // quantity * 100 = 20,000g of curd, and the meal logged as 30,200 kcal.
      expect(resolveGrams(undefined, 200, 'ml')).toBe(200);
      expect(resolveGrams(undefined, 250, 'millilitres')).toBe(250);
    });

    it('handles the other measurement units', () => {
      expect(resolveGrams(undefined, 150, 'g')).toBe(150);
      expect(resolveGrams(undefined, 1.5, 'kg')).toBe(1500);
      expect(resolveGrams(undefined, 1, 'litre')).toBe(1000);
      expect(resolveGrams(undefined, 2, 'oz')).toBeCloseTo(56.7, 1);
    });

    it('does not care about spacing or case', () => {
      expect(resolveGrams(undefined, 200, ' ML ')).toBe(200);
      expect(resolveGrams(undefined, 100, 'Grams')).toBe(100);
    });
  });

  describe('units that are a COUNT', () => {
    it('multiplies by what one of them weighs', () => {
      const chapati = findFoodEntry('chapati');
      // 40g per medium chapati.
      expect(resolveGrams(chapati, 2, 'medium')).toBe(80);
    });

    it('falls back to the entry default for an unknown count unit', () => {
      const banana = findFoodEntry('banana');
      // defaultUnit "whole" is 118g.
      expect(resolveGrams(banana, 1, 'piece')).toBe(118);
    });

    it('assumes a serving when nothing is known about the food', () => {
      expect(resolveGrams(undefined, 1, 'serving')).toBe(100);
      expect(resolveGrams(undefined, 3, 'piece')).toBe(300);
    });
  });

  describe('the plausibility cap', () => {
    it('refuses to believe a single item weighs twenty kilograms', () => {
      // Even if a unit is misread, the day's total must not be destroyed.
      expect(resolveGrams(undefined, 200, 'servings')).toBe(MAX_PLAUSIBLE_GRAMS);
    });

    it('caps an absurd model-supplied weight too', () => {
      // estimatedWeightGrams comes from the vision model and is just as
      // capable of being wrong by orders of magnitude.
      expect(resolveGrams(undefined, 1, 'bowl', 999_999)).toBe(MAX_PLAUSIBLE_GRAMS);
    });

    it('leaves a large-but-believable amount alone', () => {
      expect(resolveGrams(undefined, 1, 'kg')).toBe(1000);
      expect(resolveGrams(undefined, 2.5, 'kg')).toBe(2500);
    });
  });

  describe('degenerate input', () => {
    it('prefers an explicit weight over the unit', () => {
      expect(resolveGrams(findFoodEntry('chapati'), 5, 'medium', 55)).toBe(55);
    });

    it('treats a missing or nonsensical quantity as one', () => {
      expect(resolveGrams(undefined, 0, 'serving')).toBe(100);
      expect(resolveGrams(undefined, Number.NaN, 'serving')).toBe(100);
      expect(resolveGrams(undefined, -5, 'g')).toBe(1);
    });

    it('never returns a negative weight', () => {
      expect(resolveGrams(undefined, 1, 'bowl', -50)).toBeGreaterThanOrEqual(0);
    });
  });

  it('produces a sane calorie figure for the meal that started this', () => {
    // 200ml curd at roughly 60 kcal/100g should land near 120 kcal — not 30,200.
    const grams = resolveGrams(undefined, 200, 'ml');
    expect((grams / 100) * 60).toBeCloseTo(120, 0);
  });
});

describe('serving sizes that were silently wrong', () => {
  it('treats a scoop of protein powder as ~32g, not 100g', () => {
    const powder = findFoodEntry('protein powder');
    expect(powder).toBeDefined();

    const grams = resolveGrams(powder, 1, 'scoop');
    expect(grams).toBe(32);

    // USDA's ~390 kcal/100g for whey is correct; the serving size was not.
    // At 100g a single scoop logged as ~390 kcal instead of ~125.
    const kcal = (grams / 100) * powder!.per100g.calories;
    expect(kcal).toBeGreaterThan(100);
    expect(kcal).toBeLessThan(150);
  });

  it('reports a believable protein figure for one scoop', () => {
    const powder = findFoodEntry('protein powder')!;
    const protein = (resolveGrams(powder, 1, 'scoop') / 100) * powder.per100g.proteinG;
    expect(protein).toBeGreaterThan(20);
    expect(protein).toBeLessThan(30);
  });

  it('matches the names people actually use', () => {
    for (const name of ['protein powder', 'whey protein', 'whey', 'one scoop of whey protein']) {
      expect(findFoodEntry(name)?.canonicalName).toBe('protein powder');
    }
  });

  it('keeps a mixed shake distinct from the powder', () => {
    // A shake is mostly the liquid; a scoop is just the powder.
    expect(findFoodEntry('protein shake')?.canonicalName).toBe('protein shake');
    expect(resolveGrams(findFoodEntry('protein shake'), 1, 'glass')).toBe(300);
    expect(resolveGrams(findFoodEntry('protein shake'), 1, 'scoop')).toBe(32);
  });
});

describe('units that need a question rather than a guess', () => {
  it('recognises container words whose size genuinely varies', () => {
    for (const unit of ['bowl', 'bowls', 'katori', 'plate', 'handful']) {
      expect(isAmbiguousUnit(unit)).toBe(true);
    }
  });

  it('does NOT treat a real measurement as ambiguous', () => {
    // "Half a pound" needs a conversion, not a question. Asking about
    // everything would make voice logging slower than typing.
    for (const unit of ['g', 'kg', 'ml', 'litre', 'lb', 'pound', 'oz', 'scoop', 'tbsp']) {
      expect(isAmbiguousUnit(unit)).toBe(false);
    }
  });

  it('offers small/medium/large with real gram figures', () => {
    const options = sizeOptionsFor('bowl');
    expect(options.map((o) => o.label)).toEqual(['Small bowl', 'Medium bowl', 'Large bowl']);
    expect(options[0].grams).toBeLessThan(options[2].grams);
  });

  it('falls back to the medium size, so an unanswered question still gives a sane number', () => {
    // Previously a bowl fell through to a flat 100g.
    expect(resolveGrams(undefined, 1, 'bowl')).toBe(250);
    expect(resolveGrams(undefined, 2, 'bowls')).toBe(500);
    expect(resolveGrams(undefined, 1, 'handful')).toBe(30);
  });

  it('lets the food own figure win over the generic size', () => {
    const dal = findFoodEntry('dal');
    // The table knows what a bowl of dal weighs; that beats the generic guess.
    if (dal?.gramsPerUnit.bowl) {
      expect(resolveGrams(dal, 1, 'bowl')).toBe(dal.gramsPerUnit.bowl);
    }
  });
});
