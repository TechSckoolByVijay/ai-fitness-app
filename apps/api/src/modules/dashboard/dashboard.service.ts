import type { PrismaClient } from '@prisma/client';
import type { DashboardToday } from '@fitness-app/shared';
import { toDateOnly } from '../daily-summary';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatItemLabel(item: { name: string; quantity: unknown }): string {
  const quantity = Number(item.quantity);
  const prefix = quantity !== 1 ? `${quantity} ` : '';
  return `${prefix}${item.name}`;
}

function formatActivityLabel(activityType: string, durationMin: number): string {
  return `${activityType.replace('_', ' ')} — ${durationMin} min`;
}

export async function getTodayDashboard(prisma: PrismaClient, userId: string): Promise<DashboardToday> {
  const today = toDateOnly(new Date());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [profile, summary, entries, exerciseEntries] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.dailySummary.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.foodEntry.findMany({
      where: { userId, loggedAt: { gte: today, lt: tomorrow } },
      include: { items: { include: { nutrition: true } } },
      orderBy: { loggedAt: 'asc' },
    }),
    prisma.exerciseEntry.findMany({
      where: { userId, loggedAt: { gte: today, lt: tomorrow } },
      orderBy: { loggedAt: 'asc' },
    }),
  ]);

  const meals = entries.map((entry) => {
    const calories = entry.items.reduce(
      (sum, item) => sum + (item.nutrition ? Number(item.nutrition.calories) : 0),
      0,
    );

    return {
      id: entry.id,
      time: formatTime(entry.loggedAt),
      mealType: entry.mealType,
      summaryText: entry.items.map(formatItemLabel).join(' + '),
      calories: round1(calories),
    };
  });

  const activities = exerciseEntries.map((entry) => ({
    id: entry.id,
    time: formatTime(entry.loggedAt),
    activityType: entry.activityType,
    summaryText: formatActivityLabel(entry.activityType, entry.durationMin),
    caloriesBurned: round1(Number(entry.caloriesBurned)),
  }));

  return {
    date: today.toISOString().slice(0, 10),
    caloriesConsumed: summary ? Number(summary.caloriesConsumed) : 0,
    calorieTarget: profile?.calorieTarget ?? null,
    proteinConsumed: summary ? Number(summary.proteinConsumed) : 0,
    proteinTarget: profile?.proteinTarget ?? null,
    carbsConsumed: summary ? Number(summary.carbsConsumed) : 0,
    fatConsumed: summary ? Number(summary.fatConsumed) : 0,
    fiberConsumed: summary ? Number(summary.fiberConsumed) : 0,
    waterConsumedMl: summary?.waterConsumedMl ?? 0,
    waterTargetMl: profile?.waterTargetMl ?? null,
    // Steps/sleep are sourced from HealthDataProvider (spec section 20), not
    // wired into any Phase 1 route — null here means "not connected yet",
    // not "zero", and the mobile UI should render an empty/placeholder state.
    steps: summary?.steps ?? null,
    stepsTarget: null,
    sleepDurationMin: summary?.sleepDurationMin ?? null,
    activeCalories: summary ? Number(summary.activeCalories) : 0,
    exerciseDurationMin: summary?.exerciseDurationMin ?? 0,
    meals,
    activities,
  };
}
