import type { GoalType } from '@fitness-app/shared';

/**
 * The plain-language summary shown on Home.
 *
 * Kept pure and separate from the card so the wording can be tested. The
 * card's whole job is to answer two questions — "how much more can I eat?"
 * and "how much more protein do I need?" — and the honest answer to the
 * first depends entirely on the goal:
 *
 *   losing    calories are a CEILING. Room left is permission to eat.
 *   gaining   calories are a FLOOR. Room left is work still to do.
 *   maintain  calories are a BAND. Being near it is the win.
 *
 * Protein is always a floor, whatever the goal. That asymmetry is the thing
 * the previous card got wrong: it drew a ceiling and a floor identically,
 * so 805/1331 (good) and 18/84 (bad) looked like the same kind of fact.
 */

export type CalorieStance = 'ceiling' | 'floor' | 'band';

export interface HomeSummaryInput {
  goalType: GoalType | null;
  calorieTarget: number | null;
  caloriesConsumed: number;
  activeCalories: number;
  proteinTarget: number | null;
  proteinConsumed: number;
}

export interface HomeSummary {
  /** How calories should be read for this goal. */
  stance: CalorieStance;
  /** Signed: positive means room remaining, negative means past the target. */
  caloriesRemaining: number | null;
  proteinRemaining: number | null;
  /** "You can eat 526 kcal more today." */
  calorieSentence: string;
  /** "You need 66 g more protein." */
  proteinSentence: string | null;
  /** Ties both numbers back to the goal, so the target is never ambiguous. */
  goalSentence: string | null;
  /** True when a calorie CEILING has been passed — the only real warning state. */
  isOverCeiling: boolean;
}

function stanceFor(goalType: GoalType | null): CalorieStance {
  if (goalType === 'gain_muscle') return 'floor';
  if (goalType === 'maintain_weight') return 'band';
  // lose_weight, and the non-directional goals, all read as a ceiling: the
  // target is the most you should eat.
  return 'ceiling';
}

function round(value: number): number {
  return Math.round(value);
}

export function buildHomeSummary(input: HomeSummaryInput): HomeSummary {
  const stance = stanceFor(input.goalType);

  if (input.calorieTarget == null) {
    return {
      stance,
      caloriesRemaining: null,
      proteinRemaining: null,
      calorieSentence: 'Set your body info to get a daily calorie target.',
      proteinSentence: null,
      goalSentence: null,
      isOverCeiling: false,
    };
  }

  // Exercise genuinely widens the day's allowance, so it is added back —
  // the same arithmetic the AI coach reasons with.
  const remaining = round(input.calorieTarget - input.caloriesConsumed + input.activeCalories);
  const over = remaining < 0;
  const magnitude = Math.abs(remaining);

  let calorieSentence: string;
  if (stance === 'floor') {
    calorieSentence = over
      ? `You've eaten ${magnitude} kcal past today's target — good for gaining.`
      : `Eat ${magnitude} kcal more to reach today's target.`;
  } else if (stance === 'band') {
    calorieSentence = over
      ? `You're ${magnitude} kcal above today's target.`
      : `You can eat ${magnitude} kcal more today.`;
  } else {
    calorieSentence = over
      ? `You're ${magnitude} kcal over today's limit.`
      : `You can eat ${magnitude} kcal more today.`;
  }

  let proteinRemaining: number | null = null;
  let proteinSentence: string | null = null;
  if (input.proteinTarget != null) {
    proteinRemaining = round(input.proteinTarget - input.proteinConsumed);
    proteinSentence =
      proteinRemaining > 0
        ? `You need ${proteinRemaining} g more protein.`
        : `Protein target reached — ${round(input.proteinConsumed)} g so far.`;
  }

  const target = input.calorieTarget.toLocaleString();
  const goalSentence =
    stance === 'floor'
      ? `Reaching ${target} kcal keeps you gaining.`
      : stance === 'band'
        ? `Staying near ${target} kcal keeps your weight steady.`
        : `Staying under ${target} kcal keeps you losing weight.`;

  return {
    stance,
    caloriesRemaining: remaining,
    proteinRemaining,
    calorieSentence,
    proteinSentence,
    goalSentence,
    // Only a passed CEILING is a warning. Falling short of a floor is
    // simply "not done yet", and must never be coloured like a failure.
    isOverCeiling: stance !== 'floor' && over,
  };
}
