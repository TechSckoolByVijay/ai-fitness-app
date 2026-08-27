import { classifyCalorieAlignment, type GoalType, type InsightCard, type MealType } from '@fitness-app/shared';

function round(value: number): number {
  return Math.round(value);
}

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snacks',
};

/**
 * Compares average protein per day across meal types (breakfast/lunch/dinner
 * — snacks are excluded, too unstructured to compare fairly) and nudges
 * toward the meal that's lagging furthest behind, e.g. "you get more protein
 * at lunch than dinner." Needs a handful of logged days per meal type before
 * saying anything, so it stays quiet rather than drawing conclusions from one
 * or two entries.
 */
export function buildMealProteinCard(params: {
  /** Average grams of protein per day the meal type was logged, keyed by meal type. Only meal types with enough days of data should be included. */
  avgProteinByMeal: Partial<Record<MealType, number>>;
}): InsightCard | null {
  const comparableMeals: MealType[] = ['breakfast', 'lunch', 'dinner'];
  const entries = comparableMeals
    .map((meal) => [meal, params.avgProteinByMeal[meal]] as const)
    .filter((entry): entry is [MealType, number] => entry[1] !== undefined);

  if (entries.length < 2) return null;

  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const [highestMeal, highestAvg] = sorted[0];
  const [lowestMeal, lowestAvg] = sorted[sorted.length - 1];

  // Only worth mentioning if the gap is both meaningfully large in absolute
  // terms and a substantial fraction of the stronger meal — avoids nagging
  // over noise like a 22g vs 18g difference.
  const gap = highestAvg - lowestAvg;
  if (gap < 8 || gap / highestAvg < 0.35) return null;

  return {
    id: 'meal-protein-pattern',
    emoji: '🥩',
    message: `You're getting more protein at ${MEAL_LABEL[highestMeal]} (~${round(highestAvg)}g) than ${MEAL_LABEL[lowestMeal]} (~${round(lowestAvg)}g). Try adding a protein source to ${MEAL_LABEL[lowestMeal]}.`,
    tone: 'nudge',
  };
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

  const alignment = classifyCalorieAlignment(goalType, yesterdayCalories, calorieTarget);
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
    if (!calories || classifyCalorieAlignment(goalType, calories, calorieTarget) !== 'favorable') break;
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
