import type { PrismaClient } from '@prisma/client';
import type { FoodItemInput, FrequentMealDto, FrequentMealsResponse } from '@fitness-app/shared';

/** Only surface a combination once it's been logged more than once — a single log isn't "frequent" yet. */
const MIN_USE_COUNT = 2;
const DEFAULT_LIMIT = 5;

function toFrequentMealDto(row: {
  id: string;
  name: string;
  mealType: string;
  itemsJson: unknown;
  useCount: number;
  lastUsedAt: Date | null;
}): FrequentMealDto {
  return {
    id: row.id,
    name: row.name,
    mealType: row.mealType as FrequentMealDto['mealType'],
    items: row.itemsJson as FoodItemInput[],
    useCount: row.useCount,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
  };
}

export async function listFrequentMeals(
  prisma: PrismaClient,
  userId: string,
  limit = DEFAULT_LIMIT,
): Promise<FrequentMealsResponse> {
  const rows = await prisma.frequentMeal.findMany({
    where: { userId, useCount: { gte: MIN_USE_COUNT } },
    orderBy: [{ useCount: 'desc' }, { lastUsedAt: 'desc' }],
    take: limit,
  });

  return { frequentMeals: rows.map(toFrequentMealDto) };
}
