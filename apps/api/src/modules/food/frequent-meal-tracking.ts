import type { PrismaClient } from '@prisma/client';
import type { FoodItemInput, MealType } from '@fitness-app/shared';

/**
 * "The same meal" is detected by mealType + the set of food names, ignoring
 * quantity/descriptors — coarse on purpose, since casual voice logging of
 * the same meal rarely repeats exact portions. Pure so it's unit-testable
 * without a database.
 */
export function computeMealSignature(mealType: string, items: Array<{ name: string }>): string {
  const sortedNames = items.map((item) => item.name.trim().toLowerCase()).sort();
  return `${mealType}|${sortedNames.join(',')}`;
}

const MAX_DISPLAY_NAME_LENGTH = 80;

export function buildDisplayName(items: Array<{ name: string }>): string {
  return items
    .map((item) => item.name)
    .join(', ')
    .slice(0, MAX_DISPLAY_NAME_LENGTH);
}

/**
 * Increments (or creates) the FrequentMeal row for this exact combination —
 * called on every food entry creation (AI-interpreted, favorite re-log, or
 * duplicate), never on edit, since an edit is a correction, not a new
 * occurrence. This is a passive signal only: nothing surfaces it to the user
 * until it's been logged at least twice — see frequent-meals.service.ts.
 */
export async function trackFrequentMeal(
  prisma: PrismaClient,
  userId: string,
  mealType: MealType,
  items: FoodItemInput[],
): Promise<void> {
  const signature = computeMealSignature(mealType, items);
  const name = buildDisplayName(items);

  await prisma.frequentMeal.upsert({
    where: { userId_signature: { userId, signature } },
    update: {
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
      itemsJson: items,
      name,
    },
    create: {
      userId,
      signature,
      mealType,
      itemsJson: items,
      name,
      useCount: 1,
      lastUsedAt: new Date(),
    },
  });
}
