import { classifyCalorieAlignment, type GoalType } from '@fitness-app/shared';

const EATING_WINDOW_START_HOUR = 7;
const EATING_WINDOW_END_HOUR = 22;

/**
 * The body burns calories continuously, not just at whatever moment food
 * gets logged — showing "0 / 2020 kcal" at 9am looks alarming even though
 * it's completely normal that early. This estimates "what fraction of the
 * day's target would a typical eating pattern have reached by now",
 * prorated across a fixed 7am-10pm eating window (a simple, honest
 * approximation — not a real per-user pattern, deliberately not claiming
 * more precision than that) rather than a full 24h day, since almost no
 * consumption happens overnight.
 */
export function expectedCaloriesByNow(calorieTarget: number, now: Date = new Date()): number {
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour <= EATING_WINDOW_START_HOUR) return 0;
  if (hour >= EATING_WINDOW_END_HOUR) return calorieTarget;
  const fraction = (hour - EATING_WINDOW_START_HOUR) / (EATING_WINDOW_END_HOUR - EATING_WINDOW_START_HOUR);
  return Math.round(calorieTarget * fraction);
}

export interface CaloriePaceInfo {
  expectedByNow: number;
  /** Same favorable/unfavorable/neutral semantics as the backend's yesterday insight card — goal-aware, not a flat "under is good". */
  alignment: ReturnType<typeof classifyCalorieAlignment>;
  message: string;
}

function round(value: number): number {
  return Math.round(value);
}

/**
 * Builds the pace comparison + a short, factual sentence — deliberately
 * plain "here's what the numbers say" language (see PLAN.md's Play Store
 * health-review notes), never anything that reads as a medical judgment.
 */
export function getCaloriePace(
  goalType: GoalType | null,
  caloriesConsumed: number,
  calorieTarget: number,
  now: Date = new Date(),
): CaloriePaceInfo {
  const expectedByNow = expectedCaloriesByNow(calorieTarget, now);

  if (expectedByNow === 0) {
    return {
      expectedByNow,
      alignment: 'neutral',
      message: 'Your eating window opens around 7am — nothing expected yet.',
    };
  }

  const alignment = classifyCalorieAlignment(goalType, caloriesConsumed, expectedByNow);
  const diff = round(Math.abs(caloriesConsumed - expectedByNow));
  const isOverPace = caloriesConsumed > expectedByNow;

  if (diff === 0) {
    return { expectedByNow, alignment, message: `Right on pace for this time of day.` };
  }

  if (goalType === 'lose_weight') {
    return {
      expectedByNow,
      alignment,
      message: isOverPace
        ? `${diff} kcal ahead of pace — you've eaten more than usual for this time of day.`
        : `${diff} kcal under pace — nice, that's building today's deficit.`,
    };
  }

  if (goalType === 'gain_muscle') {
    return {
      expectedByNow,
      alignment,
      message: isOverPace
        ? `${diff} kcal ahead of pace — good fuel for the day.`
        : `${diff} kcal behind pace for today's target.`,
    };
  }

  return {
    expectedByNow,
    alignment,
    message: `${diff} kcal ${isOverPace ? 'ahead of' : 'behind'} pace for this time of day.`,
  };
}
