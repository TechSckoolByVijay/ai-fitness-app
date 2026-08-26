import type { GoalType, InsightCard } from '@fitness-app/shared';

export type CalorieAlignment = 'favorable' | 'unfavorable' | 'neutral';

const TOLERANCE_FRACTION = 0.05;

/**
 * "Good" calorie direction depends on the goal — a deficit is progress for
 * weight loss but a setback for muscle gain. Rule-based only (arithmetic
 * over stored targets), deliberately staying in "here's what the numbers
 * say" territory rather than anything that could read as medical judgment —
 * see openai.provider.ts's Coach system prompt for the same boundary
 * applied to the AI-generated side of insights.
 */
export function classifyCalorieDirection(
  goalType: GoalType | null,
  consumedCalories: number,
  calorieTarget: number,
): CalorieAlignment {
  const diff = consumedCalories - calorieTarget;
  const tolerance = calorieTarget * TOLERANCE_FRACTION;

  if (goalType === 'lose_weight') {
    if (diff < -tolerance) return 'favorable';
    if (diff > tolerance) return 'unfavorable';
    return 'neutral';
  }

  if (goalType === 'gain_muscle') {
    if (diff > tolerance) return 'favorable';
    if (diff < -tolerance) return 'unfavorable';
    return 'neutral';
  }

  // maintain_weight and the non-calorie-direction goals (improve_fitness,
  // improve_health, improve_sleep, healthier_eating): staying close to the
  // target is the favorable outcome, in either direction.
  return Math.abs(diff) <= tolerance ? 'favorable' : 'neutral';
}

function round(value: number): number {
  return Math.round(value);
}

export function buildYesterdayCard(params: {
  goalType: GoalType | null;
  calorieTarget: number | null;
  yesterdayCalories: number | null;
}): InsightCard {
  const { goalType, calorieTarget, yesterdayCalories } = params;

  if (!calorieTarget) {
    return {
      id: 'no-target',
      emoji: '🎯',
      message: 'Finish setting up your profile to start getting personalized daily insights.',
      tone: 'neutral',
    };
  }

  if (!yesterdayCalories) {
    return {
      id: 'yesterday-no-log',
      emoji: '💪',
      message: "No meals logged yesterday — let's start today strong. Even one logged meal keeps your streak alive.",
      tone: 'nudge',
    };
  }

  const alignment = classifyCalorieDirection(goalType, yesterdayCalories, calorieTarget);
  const diff = round(Math.abs(yesterdayCalories - calorieTarget));
  const isSurplus = yesterdayCalories > calorieTarget;

  if (goalType === 'lose_weight') {
    if (alignment === 'favorable') {
      return {
        id: 'yesterday-calories',
        emoji: '👏',
        message: `Yesterday you were ${diff} kcal under target — real progress toward your weight-loss goal.`,
        tone: 'positive',
      };
    }
    if (alignment === 'unfavorable') {
      return {
        id: 'yesterday-calories',
        emoji: '🎯',
        message: `Yesterday ran ${diff} kcal over target. Today's a fresh start — let's bring it back down.`,
        tone: 'nudge',
      };
    }
    return {
      id: 'yesterday-calories',
      emoji: '✅',
      message: 'Yesterday you landed right around your target. Steady progress.',
      tone: 'positive',
    };
  }

  if (goalType === 'gain_muscle') {
    if (alignment === 'favorable') {
      return {
        id: 'yesterday-calories',
        emoji: '💪',
        message: `Yesterday you were ${diff} kcal over target — good fuel for muscle growth.`,
        tone: 'positive',
      };
    }
    if (alignment === 'unfavorable') {
      return {
        id: 'yesterday-calories',
        emoji: '🎯',
        message: `Yesterday ran ${diff} kcal under target. Try to hit your target today to support muscle growth.`,
        tone: 'nudge',
      };
    }
    return {
      id: 'yesterday-calories',
      emoji: '✅',
      message: 'Yesterday you landed right around your target. Steady progress.',
      tone: 'positive',
    };
  }

  // maintain_weight and general/non-calorie goals.
  if (alignment === 'favorable') {
    return {
      id: 'yesterday-calories',
      emoji: '✅',
      message: 'Yesterday you landed close to your target — nice consistency.',
      tone: 'positive',
    };
  }
  return {
    id: 'yesterday-calories',
    emoji: '🎯',
    message: `Yesterday was ${diff} kcal ${isSurplus ? 'over' : 'under'} target. Let's aim closer today.`,
    tone: 'nudge',
  };
}

/**
 * `dailyCalories` must be ordered oldest-first, ending with yesterday (today
 * is deliberately excluded — it's still in progress, so it can't yet count
 * as a completed favorable day).
 */
export function buildStreakCard(params: {
  goalType: GoalType | null;
  calorieTarget: number | null;
  dailyCalories: number[];
}): InsightCard | null {
  const { goalType, calorieTarget, dailyCalories } = params;
  if (!calorieTarget) return null;

  let streak = 0;
  for (let i = dailyCalories.length - 1; i >= 0; i--) {
    const calories = dailyCalories[i];
    if (!calories || classifyCalorieDirection(goalType, calories, calorieTarget) !== 'favorable') break;
    streak++;
  }

  if (streak < 2) return null;

  return {
    id: 'streak',
    emoji: '🔥',
    message: `${streak} days in a row hitting your goal. Keep the momentum going today.`,
    tone: 'positive',
  };
}
