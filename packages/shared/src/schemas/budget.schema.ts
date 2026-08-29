import { z } from 'zod';

/**
 * The app will not accept a self-set target below this, matching the floor
 * the automatic calculator already applies (PRODUCT.md principle 7). The
 * reference app allows 800; going that low unsupervised is a place this app
 * should not take people, so the guard stays.
 */
export const MIN_CUSTOM_CALORIES = 1200;
export const MAX_CUSTOM_CALORIES = 5000;

/** Macro percentages must describe a whole budget, not part of one. */
export const MACRO_PCT_TOTAL = 100;

export const MacroSplitSchema = z
  .object({
    carbPct: z.number().int().min(0).max(100),
    fatPct: z.number().int().min(0).max(100),
    proteinPct: z.number().int().min(0).max(100),
  })
  .refine((s) => s.carbPct + s.fatPct + s.proteinPct === MACRO_PCT_TOTAL, {
    message: 'Macro percentages must add up to 100',
  });
export type MacroSplit = z.infer<typeof MacroSplitSchema>;

export const UpdateBudgetRequestSchema = z.discriminatedUnion('mode', [
  /** Hand the target back to the calculator; any custom values are dropped. */
  z.object({ mode: z.literal('standard') }),
  z.object({
    mode: z.literal('custom'),
    calorieTarget: z.number().int().min(MIN_CUSTOM_CALORIES).max(MAX_CUSTOM_CALORIES),
    macros: MacroSplitSchema,
  }),
]);
export type UpdateBudgetRequest = z.infer<typeof UpdateBudgetRequestSchema>;

/** A balanced default for someone who has never touched the macro sliders. */
export const DEFAULT_MACRO_SPLIT: MacroSplit = { carbPct: 40, fatPct: 30, proteinPct: 30 };

/** Calories per gram — the Atwater factors the whole app's macro maths uses. */
const KCAL_PER_GRAM = { carb: 4, fat: 9, protein: 4 } as const;

export interface MacroGrams {
  carbGrams: number;
  fatGrams: number;
  proteinGrams: number;
}

/** Turns a percentage split into the gram targets shown on the dashboard. */
export function macroGramsFor(calorieTarget: number, macros: MacroSplit): MacroGrams {
  return {
    carbGrams: Math.round((calorieTarget * macros.carbPct) / 100 / KCAL_PER_GRAM.carb),
    fatGrams: Math.round((calorieTarget * macros.fatPct) / 100 / KCAL_PER_GRAM.fat),
    proteinGrams: Math.round((calorieTarget * macros.proteinPct) / 100 / KCAL_PER_GRAM.protein),
  };
}

/**
 * Adjusts one macro and absorbs the difference in the others, so the split
 * always totals 100.
 *
 * The remainder is spread across the other two in proportion to their
 * current sizes, which keeps their relationship intact rather than dumping
 * the whole change on one of them. Integer rounding leftovers land on the
 * larger of the two, so the total is exact rather than 99 or 101.
 */
export function rebalanceMacros(current: MacroSplit, key: keyof MacroSplit, nextValue: number): MacroSplit {
  const clamped = Math.max(0, Math.min(100, Math.round(nextValue)));
  const others = (['carbPct', 'fatPct', 'proteinPct'] as const).filter((k) => k !== key);
  const remaining = MACRO_PCT_TOTAL - clamped;
  const othersTotal = current[others[0]] + current[others[1]];

  // If the other two are both zero there is no ratio to preserve — split evenly.
  const firstShare =
    othersTotal === 0 ? Math.round(remaining / 2) : Math.round((current[others[0]] / othersTotal) * remaining);

  const result = {
    ...current,
    [key]: clamped,
    [others[0]]: firstShare,
    [others[1]]: remaining - firstShare,
  } as MacroSplit;

  return result;
}
