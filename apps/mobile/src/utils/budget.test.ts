import {
  DEFAULT_MACRO_SPLIT,
  macroGramsFor,
  MACRO_PCT_TOTAL,
  MacroSplitSchema,
  rebalanceMacros,
  UpdateBudgetRequestSchema,
} from '@fitness-app/shared';

describe('macro split', () => {
  it('rejects a split that does not add up to 100', () => {
    expect(MacroSplitSchema.safeParse({ carbPct: 40, fatPct: 30, proteinPct: 40 }).success).toBe(false);
    expect(MacroSplitSchema.safeParse(DEFAULT_MACRO_SPLIT).success).toBe(true);
  });

  it('always totals exactly 100 after a rebalance', () => {
    // Integer rounding is where this kind of thing drifts to 99 or 101.
    for (let value = 0; value <= 100; value++) {
      for (const key of ['carbPct', 'fatPct', 'proteinPct'] as const) {
        const next = rebalanceMacros(DEFAULT_MACRO_SPLIT, key, value);
        expect(next.carbPct + next.fatPct + next.proteinPct).toBe(MACRO_PCT_TOTAL);
        expect(next[key]).toBe(value);
      }
    }
  });

  it('preserves the ratio between the two macros it did not touch', () => {
    // fat:protein is 2:1 here, so it should stay 2:1 after carbs move.
    const start = { carbPct: 40, fatPct: 40, proteinPct: 20 };
    const next = rebalanceMacros(start, 'carbPct', 10);
    expect(next.carbPct).toBe(10);
    expect(next.fatPct / next.proteinPct).toBeCloseTo(2, 1);
  });

  it('splits evenly when there is no ratio left to preserve', () => {
    const next = rebalanceMacros({ carbPct: 100, fatPct: 0, proteinPct: 0 }, 'carbPct', 50);
    expect(next).toEqual({ carbPct: 50, fatPct: 25, proteinPct: 25 });
  });

  it('clamps out-of-range input rather than producing a negative macro', () => {
    expect(rebalanceMacros(DEFAULT_MACRO_SPLIT, 'carbPct', 150).carbPct).toBe(100);
    expect(rebalanceMacros(DEFAULT_MACRO_SPLIT, 'carbPct', -20).carbPct).toBe(0);
  });
});

describe('macro grams', () => {
  it('converts a split into grams using the Atwater factors', () => {
    // 2000 kcal at 40/30/30: carbs 800/4=200g, fat 600/9=67g, protein 600/4=150g.
    expect(macroGramsFor(2000, DEFAULT_MACRO_SPLIT)).toEqual({
      carbGrams: 200,
      fatGrams: 67,
      proteinGrams: 150,
    });
  });
});

describe('budget request', () => {
  it('refuses a custom target below the 1200 kcal floor', () => {
    const below = { mode: 'custom', calorieTarget: 800, macros: DEFAULT_MACRO_SPLIT };
    expect(UpdateBudgetRequestSchema.safeParse(below).success).toBe(false);

    const at = { mode: 'custom', calorieTarget: 1200, macros: DEFAULT_MACRO_SPLIT };
    expect(UpdateBudgetRequestSchema.safeParse(at).success).toBe(true);
  });

  it('refuses an absurdly high target', () => {
    const above = { mode: 'custom', calorieTarget: 9000, macros: DEFAULT_MACRO_SPLIT };
    expect(UpdateBudgetRequestSchema.safeParse(above).success).toBe(false);
  });

  it('accepts standard mode with no other fields', () => {
    expect(UpdateBudgetRequestSchema.safeParse({ mode: 'standard' }).success).toBe(true);
  });
});
