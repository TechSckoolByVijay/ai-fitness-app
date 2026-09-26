import type { MealType } from '../schemas/enums.schema';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  all_day: 'Through the day',
};

export function mealTypeLabel(mealType: MealType): string {
  return MEAL_LABELS[mealType];
}

/**
 * Where a "some time that day" entry is stored. Days are bucketed by UTC
 * date, and 12:00 UTC falls on the same calendar date in every time zone
 * from UTC-11 to UTC+11 — so the entry can't drift onto the neighbouring day.
 *
 * `localTimestamp` must carry the user's own date (an ISO string with their
 * offset, or a bare YYYY-MM-DD); its date part is taken as-is.
 */
export function dayPrecisionLoggedAt(localTimestamp: string): string {
  const date = localTimestamp.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Not an ISO date: ${localTimestamp}`);
  }
  return `${date}T12:00:00.000Z`;
}
