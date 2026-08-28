import type { PrismaClient } from '@prisma/client';
import type { InsightsResponse, MealType } from '@fitness-app/shared';
import { toDateOnly } from '../daily-summary';
import { buildMealProteinCard, buildStreakCard, buildYesterdayCard } from './insights-logic';

const STREAK_LOOKBACK_DAYS = 14;
const MEAL_PATTERN_LOOKBACK_DAYS = 7;
const MIN_DAYS_PER_MEAL = 3;

async function getAvgProteinByMeal(
  prisma: PrismaClient,
  userId: string,
  since: Date,
): Promise<Partial<Record<MealType, number>>> {
  const entries = await prisma.foodEntry.findMany({
    where: { userId, loggedAt: { gte: since }, status: 'confirmed' },
    select: {
      mealType: true,
      loggedAt: true,
      items: { select: { nutrition: { select: { proteinG: true } } } },
    },
  });

  // proteinByMealAndDay[mealType][dateKey] = total protein grams that day for that meal type.
  const proteinByMealAndDay = new Map<MealType, Map<string, number>>();
  for (const entry of entries) {
    const dateKey = toDateOnly(entry.loggedAt).toISOString().slice(0, 10);
    const proteinForEntry = entry.items.reduce((sum, item) => sum + Number(item.nutrition?.proteinG ?? 0), 0);
    const mealType = entry.mealType as MealType;
    const byDay = proteinByMealAndDay.get(mealType) ?? new Map<string, number>();
    byDay.set(dateKey, (byDay.get(dateKey) ?? 0) + proteinForEntry);
    proteinByMealAndDay.set(mealType, byDay);
  }

  const avgByMeal: Partial<Record<MealType, number>> = {};
  for (const [mealType, byDay] of proteinByMealAndDay) {
    if (byDay.size < MIN_DAYS_PER_MEAL) continue;
    const total = Array.from(byDay.values()).reduce((sum, v) => sum + v, 0);
    avgByMeal[mealType] = total / byDay.size;
  }
  return avgByMeal;
}

export async function getTodayInsights(prisma: PrismaClient, userId: string): Promise<InsightsResponse> {
  const today = toDateOnly(new Date());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lookbackStart = new Date(today.getTime() - STREAK_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const mealPatternStart = new Date(today.getTime() - MEAL_PATTERN_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [primaryGoal, summaries, avgProteinByMeal, yesterdayEntries] = await Promise.all([
    prisma.goal.findFirst({ where: { userId, isPrimary: true } }),
    prisma.dailySummary.findMany({
      where: { userId, date: { gte: lookbackStart, lt: today } },
      orderBy: { date: 'asc' },
    }),
    getAvgProteinByMeal(prisma, userId, mealPatternStart),
    prisma.foodEntry.findMany({
      where: { userId, loggedAt: { gte: yesterday, lt: today }, status: 'confirmed' },
      select: { mealType: true },
      distinct: ['mealType'],
    }),
  ]);
  const yesterdayMealTypes = yesterdayEntries.map((e) => e.mealType as MealType);

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const calorieTarget = profile?.calorieTarget ?? null;
  const goalType = primaryGoal?.type ?? null;

  const summaryByDate = new Map(summaries.map((s) => [s.date.toISOString().slice(0, 10), s]));
  const dailyCalories: number[] = [];
  for (let d = new Date(lookbackStart); d < today; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    const key = d.toISOString().slice(0, 10);
    const summary = summaryByDate.get(key);
    dailyCalories.push(summary ? Number(summary.caloriesConsumed) : 0);
  }

  const yesterdaySummary = summaryByDate.get(yesterday.toISOString().slice(0, 10));
  const yesterdayCalories = yesterdaySummary ? Number(yesterdaySummary.caloriesConsumed) : null;

  const cards = [
    buildYesterdayCard({ goalType, calorieTarget, yesterdayCalories, yesterdayMealTypes }),
    buildStreakCard({ goalType, calorieTarget, dailyCalories }),
    buildMealProteinCard({ avgProteinByMeal }),
  ].filter((card): card is NonNullable<typeof card> => card !== null);

  return { cards };
}
