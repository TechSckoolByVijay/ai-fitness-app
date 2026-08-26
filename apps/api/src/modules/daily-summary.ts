import type { PrismaClient } from '@prisma/client';

export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export interface DailyNutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

interface FoodEntryLike {
  items: Array<{
    nutrition: {
      calories: unknown;
      proteinG: unknown;
      carbsG: unknown;
      fatG: unknown;
      fiberG?: unknown;
    } | null;
  }>;
}

/**
 * Pure aggregation step, factored out of recomputeDailySummary so it's
 * unit-testable without a database (spec section 42's "daily aggregation"
 * unit test target).
 */
export function sumEntryNutrition(entries: FoodEntryLike[]): DailyNutritionTotals {
  return entries.reduce<DailyNutritionTotals>(
    (acc, entry) => {
      for (const item of entry.items) {
        if (!item.nutrition) continue;
        acc.calories += Number(item.nutrition.calories);
        acc.proteinG += Number(item.nutrition.proteinG);
        acc.carbsG += Number(item.nutrition.carbsG);
        acc.fatG += Number(item.nutrition.fatG);
        acc.fiberG += Number(item.nutrition.fiberG ?? 0);
      }
      return acc;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
}

interface ExerciseEntryLike {
  durationMin: number;
  caloriesBurned: unknown;
}

export interface DailyExerciseTotals {
  activeCalories: number;
  exerciseDurationMin: number;
}

export function sumExerciseTotals(entries: ExerciseEntryLike[]): DailyExerciseTotals {
  return entries.reduce<DailyExerciseTotals>(
    (acc, entry) => {
      acc.activeCalories += Number(entry.caloriesBurned);
      acc.exerciseDurationMin += entry.durationMin;
      return acc;
    },
    { activeCalories: 0, exerciseDurationMin: 0 },
  );
}

interface WaterEntryLike {
  amountMl: number;
}

export function sumWaterMl(entries: WaterEntryLike[]): number {
  return entries.reduce((sum, entry) => sum + entry.amountMl, 0);
}

interface SleepEntryLike {
  durationMin: number;
}

export function sumSleepMinutes(entries: SleepEntryLike[]): number {
  return entries.reduce((sum, entry) => sum + entry.durationMin, 0);
}

/**
 * Recomputes a user's DailySummary for a given date directly from the
 * underlying FoodEntry, ExerciseEntry, WaterEntry, and SleepEntry rows,
 * rather than incrementally patching totals — the daily state is derived
 * from source events (spec section 14/15), which keeps corrections/edits/
 * deletes trivially correct instead of needing careful +/- bookkeeping.
 *
 * Sleep is bucketed by wokeAt (not sleptAt) — a night's sleep is credited to
 * the day the user woke up, matching the convention most sleep trackers use,
 * since sleptAt usually falls on the previous calendar day.
 */
export async function recomputeDailySummary(
  prisma: PrismaClient,
  userId: string,
  date: Date,
): Promise<void> {
  const start = date;
  const end = new Date(date.getTime() + 24 * 60 * 60 * 1000);

  const [foodEntries, exerciseEntries, waterEntries, sleepEntries] = await Promise.all([
    prisma.foodEntry.findMany({
      where: { userId, loggedAt: { gte: start, lt: end } },
      include: { items: { include: { nutrition: true } } },
    }),
    prisma.exerciseEntry.findMany({
      where: { userId, loggedAt: { gte: start, lt: end } },
    }),
    prisma.waterEntry.findMany({
      where: { userId, loggedAt: { gte: start, lt: end } },
    }),
    prisma.sleepEntry.findMany({
      where: { userId, wokeAt: { gte: start, lt: end } },
    }),
  ]);

  const nutritionTotals = sumEntryNutrition(foodEntries);
  const exerciseTotals = sumExerciseTotals(exerciseEntries);
  const waterConsumedMl = sumWaterMl(waterEntries);
  const sleepDurationMin = sumSleepMinutes(sleepEntries);

  await prisma.dailySummary.upsert({
    where: { userId_date: { userId, date } },
    update: {
      caloriesConsumed: nutritionTotals.calories,
      proteinConsumed: nutritionTotals.proteinG,
      carbsConsumed: nutritionTotals.carbsG,
      fatConsumed: nutritionTotals.fatG,
      fiberConsumed: nutritionTotals.fiberG,
      activeCalories: exerciseTotals.activeCalories,
      exerciseDurationMin: exerciseTotals.exerciseDurationMin,
      waterConsumedMl,
      sleepDurationMin,
    },
    create: {
      userId,
      date,
      caloriesConsumed: nutritionTotals.calories,
      proteinConsumed: nutritionTotals.proteinG,
      carbsConsumed: nutritionTotals.carbsG,
      fatConsumed: nutritionTotals.fatG,
      fiberConsumed: nutritionTotals.fiberG,
      activeCalories: exerciseTotals.activeCalories,
      exerciseDurationMin: exerciseTotals.exerciseDurationMin,
      waterConsumedMl,
      sleepDurationMin,
    },
  });
}
