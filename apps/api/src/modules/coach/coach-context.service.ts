import type { PrismaClient } from '@prisma/client';
import type { CoachContextInput } from '../../providers/ai/ai-provider.interface';
import { toDateOnly } from '../daily-summary';

const FREQUENT_FOODS_LOOKBACK_DAYS = 14;
const MAX_FREQUENT_FOODS = 8;
const MAX_TODAYS_MEALS = 10;

export interface FoodEntryWithItemNames {
  mealType: string;
  items: Array<{ name: string }>;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Most-eaten food names over the lookback window, most frequent first — a cheap stand-in for the FrequentMeal/FavoriteFood tables (schema-only in Phase 1). */
export function computeFrequentFoods(
  entries: FoodEntryWithItemNames[],
  limit = MAX_FREQUENT_FOODS,
): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const item of entry.items) {
      const name = item.name.toLowerCase();
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

export function summarizeTodaysMeals(
  entries: FoodEntryWithItemNames[],
  limit = MAX_TODAYS_MEALS,
): string[] {
  return entries
    .slice(0, limit)
    .map((entry) => `${entry.mealType}: ${entry.items.map((item) => item.name).join(', ') || 'unspecified'}`);
}

/** Exercise calories burned widen the day's remaining eating budget — never trusted from the LLM, always this deterministic sum. */
export function computeRemainingCalories(
  calorieTarget: number | null,
  caloriesConsumedToday: number,
  activeCaloriesBurnedToday: number,
): number | null {
  if (calorieTarget === null) return null;
  return round1(calorieTarget - caloriesConsumedToday + activeCaloriesBurnedToday);
}

export async function buildCoachContext(prisma: PrismaClient, userId: string): Promise<CoachContextInput> {
  const today = toDateOnly(new Date());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const lookbackStart = new Date(today.getTime() - FREQUENT_FOODS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [profile, summary, dietPreference, allergies, healthConditions, todaysEntries, recentEntries] =
    await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.dailySummary.findUnique({ where: { userId_date: { userId, date: today } } }),
      prisma.dietPreference.findUnique({ where: { userId } }),
      prisma.allergy.findMany({ where: { userId } }),
      prisma.healthCondition.findMany({ where: { userId } }),
      prisma.foodEntry.findMany({
        where: { userId, loggedAt: { gte: today, lt: tomorrow } },
        include: { items: true },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.foodEntry.findMany({
        where: { userId, loggedAt: { gte: lookbackStart, lt: tomorrow } },
        include: { items: true },
      }),
    ]);

  const calorieTarget = profile?.calorieTarget ?? null;
  const caloriesConsumedToday = summary ? Number(summary.caloriesConsumed) : 0;
  const proteinConsumedToday = summary ? Number(summary.proteinConsumed) : 0;
  const activeCaloriesBurnedToday = summary ? Number(summary.activeCalories ?? 0) : 0;

  return {
    calorieTarget,
    proteinTarget: profile?.proteinTarget ?? null,
    caloriesConsumedToday: round1(caloriesConsumedToday),
    proteinConsumedToday: round1(proteinConsumedToday),
    activeCaloriesBurnedToday: round1(activeCaloriesBurnedToday),
    remainingCalories: computeRemainingCalories(calorieTarget, caloriesConsumedToday, activeCaloriesBurnedToday),
    dietType: dietPreference?.dietType ?? null,
    dietOtherText: dietPreference?.otherText ?? null,
    allergies: allergies.map((allergy) => (allergy.type === 'other' ? (allergy.otherText ?? 'other') : allergy.type)),
    healthConditions: healthConditions
      .filter((c) => c.type !== 'prefer_not_to_answer')
      .map((c) => (c.type === 'other' ? (c.otherText ?? 'other') : c.type)),
    frequentFoods: computeFrequentFoods(recentEntries),
    todaysMealsSummary: summarizeTodaysMeals(todaysEntries),
  };
}
