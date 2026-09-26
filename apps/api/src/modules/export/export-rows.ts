import { mealTypeLabel, type MealType, type TimePrecision } from '@fitness-app/shared';
import type { CsvValue } from './csv';
import { eachDate, localDate, localTime } from './local-time';

/**
 * Pure row-building for the two export files, kept apart from the database
 * so every column rule is unit-testable. Numbers are rounded to one decimal:
 * the underlying values are estimates, and 14 significant digits of a
 * calorie guess would imply a precision nobody has.
 */

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface ExportFoodEntry {
  loggedAt: Date;
  timePrecision: TimePrecision;
  mealType: MealType;
  sourceText: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    grams: number | null;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    editedByUser: boolean;
    estimatedCalories: number | null;
    estimatedProteinG: number | null;
  }>;
}

export const FOOD_HEADERS = [
  'date',
  'time',
  'time_precision',
  'meal',
  'food',
  'quantity',
  'unit',
  'grams',
  'calories',
  'protein_g',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'edited_by_user',
  'estimated_calories',
  'estimated_protein_g',
  'what_you_said',
] as const;

function describeSource(sourceText: string | null): string {
  if (sourceText === '[Photo]') return '(logged from a photo)';
  return sourceText ?? '';
}

/** One row per food item, oldest first, only for dates inside [from, to]. */
export function buildFoodRows(
  entries: ExportFoodEntry[],
  timeZone: string,
  from: string,
  to: string,
): CsvValue[][] {
  return [...entries]
    .sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime())
    .filter((entry) => {
      const date = localDate(entry.loggedAt, timeZone);
      return date >= from && date <= to;
    })
    .flatMap((entry) =>
      entry.items.map((item): CsvValue[] => [
        localDate(entry.loggedAt, timeZone),
        // A "some time that day" entry has no time; its stored clock time is
        // a placeholder, and printing it would present a guess as fact.
        entry.timePrecision === 'day' ? '' : localTime(entry.loggedAt, timeZone),
        entry.timePrecision,
        mealTypeLabel(entry.mealType),
        item.name,
        round1(item.quantity),
        item.unit,
        item.grams !== null ? round1(item.grams) : null,
        round1(item.calories),
        round1(item.proteinG),
        round1(item.carbsG),
        round1(item.fatG),
        round1(item.fiberG),
        item.editedByUser,
        item.estimatedCalories !== null ? round1(item.estimatedCalories) : null,
        item.estimatedProteinG !== null ? round1(item.estimatedProteinG) : null,
        describeSource(entry.sourceText),
      ]),
    );
}

export const DAY_HEADERS = [
  'date',
  'logged',
  'meals_logged',
  'calories_in',
  'calorie_target',
  'exercise_kcal',
  'calorie_budget',
  'balance_kcal',
  'status',
  'protein_g',
  'protein_target',
  'protein_met',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'water_ml',
  'weight_kg',
  'sleep_min',
  'steps',
  'exercise_min',
  'target_source',
] as const;

/** Within ±5% of the budget counts as on target — a calorie estimate isn't more precise than that. */
export const ON_TARGET_BAND = 0.05;

export type CalorieStatus = 'deficit' | 'on_target' | 'surplus';

/**
 * Logged exercise is added to the day's budget, the same way the Home card
 * and the coach count it, so a day with a long walk isn't reported as a
 * surplus the app itself called fine.
 */
export function classifyCalorieBalance(caloriesIn: number, budget: number): CalorieStatus {
  const balance = caloriesIn - budget;
  if (Math.abs(balance) <= budget * ON_TARGET_BAND) return 'on_target';
  return balance < 0 ? 'deficit' : 'surplus';
}

export interface ExportDayInputs {
  foodEntries: ExportFoodEntry[];
  exercise: Array<{ loggedAt: Date; caloriesBurned: number; durationMin: number }>;
  water: Array<{ loggedAt: Date; amountMl: number }>;
  weights: Array<{ loggedAt: Date; weightKg: number }>;
  /** Credited to the day the user woke up, as the daily summary does. */
  sleep: Array<{ wokeAt: Date; durationMin: number }>;
  /** Keyed by YYYY-MM-DD. */
  summaries: Map<string, { steps: number | null; calorieTarget: number | null; proteinTarget: number | null }>;
  currentTargets: { calorieTarget: number | null; proteinTarget: number | null };
}

function groupByDate<T>(rows: T[], instantOf: (row: T) => Date, timeZone: string): Map<string, T[]> {
  const byDate = new Map<string, T[]>();
  for (const row of rows) {
    const date = localDate(instantOf(row), timeZone);
    const list = byDate.get(date);
    if (list) list.push(row);
    else byDate.set(date, [row]);
  }
  return byDate;
}

/**
 * One row per calendar day in [from, to], including days with nothing
 * logged — a gap is information ("I stopped logging on weekends"), and
 * silently dropping it would make an average look better than it was.
 */
export function buildDayRows(
  inputs: ExportDayInputs,
  timeZone: string,
  from: string,
  to: string,
  today: string,
): CsvValue[][] {
  const food = groupByDate(inputs.foodEntries, (e) => e.loggedAt, timeZone);
  const exercise = groupByDate(inputs.exercise, (e) => e.loggedAt, timeZone);
  const water = groupByDate(inputs.water, (e) => e.loggedAt, timeZone);
  const weights = groupByDate(inputs.weights, (e) => e.loggedAt, timeZone);
  const sleep = groupByDate(inputs.sleep, (e) => e.wokeAt, timeZone);

  return eachDate(from, to).map((date): CsvValue[] => {
    const entries = food.get(date) ?? [];
    const items = entries.flatMap((e) => e.items);
    const logged = entries.length > 0;
    const caloriesIn = items.reduce((s, i) => s + i.calories, 0);
    const proteinIn = items.reduce((s, i) => s + i.proteinG, 0);
    const dayExercise = exercise.get(date) ?? [];
    const exerciseKcal = dayExercise.reduce((s, e) => s + e.caloriesBurned, 0);
    const exerciseMin = dayExercise.reduce((s, e) => s + e.durationMin, 0);
    const dayWeights = [...(weights.get(date) ?? [])].sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
    const summary = inputs.summaries.get(date);

    // Today's target is whatever it is right now. For past days, the
    // snapshot taken that day; without one, today's target stands in and
    // target_source says so, rather than passing it off as history.
    let calorieTarget: number | null;
    let proteinTarget: number | null;
    let targetSource: string;
    if (date === today) {
      calorieTarget = inputs.currentTargets.calorieTarget;
      proteinTarget = inputs.currentTargets.proteinTarget;
      targetSource = 'that_day';
    } else if (summary && (summary.calorieTarget !== null || summary.proteinTarget !== null)) {
      calorieTarget = summary.calorieTarget;
      proteinTarget = summary.proteinTarget;
      targetSource = 'that_day';
    } else {
      calorieTarget = inputs.currentTargets.calorieTarget;
      proteinTarget = inputs.currentTargets.proteinTarget;
      targetSource = 'current';
    }
    if (calorieTarget === null && proteinTarget === null) targetSource = '';

    const budget = calorieTarget !== null ? calorieTarget + exerciseKcal : null;
    const judged = logged && budget !== null && budget > 0;

    return [
      date,
      logged,
      entries.length,
      logged ? round1(caloriesIn) : null,
      calorieTarget,
      round1(exerciseKcal),
      budget !== null ? round1(budget) : null,
      judged ? round1(caloriesIn - budget) : null,
      judged ? classifyCalorieBalance(caloriesIn, budget) : null,
      logged ? round1(proteinIn) : null,
      proteinTarget,
      logged && proteinTarget !== null ? proteinIn >= proteinTarget : null,
      logged ? round1(items.reduce((s, i) => s + i.carbsG, 0)) : null,
      logged ? round1(items.reduce((s, i) => s + i.fatG, 0)) : null,
      logged ? round1(items.reduce((s, i) => s + i.fiberG, 0)) : null,
      (water.get(date) ?? []).reduce((s, w) => s + w.amountMl, 0),
      dayWeights.length ? round1(dayWeights[dayWeights.length - 1].weightKg) : null,
      sleep.has(date) ? sleep.get(date)!.reduce((s, e) => s + e.durationMin, 0) : null,
      summary?.steps ?? null,
      exerciseMin,
      targetSource,
    ];
  });
}
