import type { PrismaClient } from '@prisma/client';
import type { ExportKind, ExportQuery } from '@fitness-app/shared';
import { toCsv } from './csv';
import { DAY_HEADERS, FOOD_HEADERS, buildDayRows, buildFoodRows, type ExportFoodEntry } from './export-rows';
import { localDate, resolveRange, safeTimeZone } from './local-time';

export interface ExportFile {
  filename: string;
  csv: string;
}

function toNumberOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

async function loadFoodEntries(
  prisma: PrismaClient,
  userId: string,
  queryStart: Date,
  queryEnd: Date,
): Promise<ExportFoodEntry[]> {
  const entries = await prisma.foodEntry.findMany({
    where: { userId, loggedAt: { gte: queryStart, lt: queryEnd } },
    include: { items: { include: { nutrition: true }, orderBy: { createdAt: 'asc' } } },
    orderBy: { loggedAt: 'asc' },
  });

  return entries.map((entry) => ({
    loggedAt: entry.loggedAt,
    timePrecision: entry.timePrecision,
    mealType: entry.mealType,
    sourceText: entry.sourceText,
    items: entry.items.map((item) => ({
      name: item.name,
      quantity: Number(item.quantity),
      unit: item.unit,
      grams: toNumberOrNull(item.estimatedWeightGrams),
      calories: Number(item.nutrition?.calories ?? 0),
      proteinG: Number(item.nutrition?.proteinG ?? 0),
      carbsG: Number(item.nutrition?.carbsG ?? 0),
      fatG: Number(item.nutrition?.fatG ?? 0),
      fiberG: Number(item.nutrition?.fiberG ?? 0),
      editedByUser: item.nutrition?.source === 'user_edited',
      estimatedCalories: toNumberOrNull(item.nutrition?.estimatedCalories),
      estimatedProteinG: toNumberOrNull(item.nutrition?.estimatedProteinG),
    })),
  }));
}

/**
 * Builds one export file for the user. Everything is grouped by the user's
 * own calendar day (Profile.timeZone), computed from the raw entries rather
 * than the stored daily summaries, whose day boundaries are UTC.
 */
export async function buildExport(
  prisma: PrismaClient,
  userId: string,
  kind: ExportKind,
  query: ExportQuery,
  now: Date = new Date(),
): Promise<ExportFile> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { timeZone: true, calorieTarget: true, proteinTarget: true },
  });
  const timeZone = safeTimeZone(profile?.timeZone ?? query.tz);
  const range = resolveRange(query, timeZone, now);
  const filename = `fitness-${kind === 'food' ? 'food-log' : 'daily-summary'}-${range.from}-to-${range.to}.csv`;
  const window = { gte: range.queryStart, lt: range.queryEnd };

  const foodEntries = await loadFoodEntries(prisma, userId, range.queryStart, range.queryEnd);

  if (kind === 'food') {
    return { filename, csv: toCsv(FOOD_HEADERS, buildFoodRows(foodEntries, timeZone, range.from, range.to)) };
  }

  const [exercise, water, weights, sleep, summaries] = await Promise.all([
    prisma.exerciseEntry.findMany({ where: { userId, loggedAt: window } }),
    prisma.waterEntry.findMany({ where: { userId, loggedAt: window } }),
    prisma.weightEntry.findMany({ where: { userId, loggedAt: window } }),
    prisma.sleepEntry.findMany({ where: { userId, wokeAt: window } }),
    prisma.dailySummary.findMany({ where: { userId, date: window } }),
  ]);

  const rows = buildDayRows(
    {
      foodEntries,
      exercise: exercise.map((e) => ({
        loggedAt: e.loggedAt,
        caloriesBurned: Number(e.caloriesBurned),
        durationMin: e.durationMin,
      })),
      water: water.map((w) => ({ loggedAt: w.loggedAt, amountMl: w.amountMl })),
      weights: weights.map((w) => ({ loggedAt: w.loggedAt, weightKg: Number(w.weightKg) })),
      sleep: sleep.map((s) => ({ wokeAt: s.wokeAt, durationMin: s.durationMin })),
      // Summary rows are keyed by UTC date; for steps and a day's target
      // snapshot that is close enough to the user's date to line up.
      summaries: new Map(
        summaries.map((s) => [
          s.date.toISOString().slice(0, 10),
          { steps: s.steps, calorieTarget: s.calorieTarget, proteinTarget: s.proteinTarget },
        ]),
      ),
      currentTargets: {
        calorieTarget: profile?.calorieTarget ?? null,
        proteinTarget: profile?.proteinTarget ?? null,
      },
    },
    timeZone,
    range.from,
    range.to,
    localDate(now, timeZone),
  );

  return { filename, csv: toCsv(DAY_HEADERS, rows) };
}
