import type { PrismaClient } from '@prisma/client';
import type { InsightsResponse } from '@fitness-app/shared';
import { toDateOnly } from '../daily-summary';
import { buildStreakCard, buildYesterdayCard } from './insights-logic';

const STREAK_LOOKBACK_DAYS = 14;

export async function getTodayInsights(prisma: PrismaClient, userId: string): Promise<InsightsResponse> {
  const today = toDateOnly(new Date());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lookbackStart = new Date(today.getTime() - STREAK_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [primaryGoal, summaries] = await Promise.all([
    prisma.goal.findFirst({ where: { userId, isPrimary: true } }),
    prisma.dailySummary.findMany({
      where: { userId, date: { gte: lookbackStart, lt: today } },
      orderBy: { date: 'asc' },
    }),
  ]);

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
    buildYesterdayCard({ goalType, calorieTarget, yesterdayCalories }),
    buildStreakCard({ goalType, calorieTarget, dailyCalories }),
  ].filter((card): card is NonNullable<typeof card> => card !== null);

  return { cards };
}
