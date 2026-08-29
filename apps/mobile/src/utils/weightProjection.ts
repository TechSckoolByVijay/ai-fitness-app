export interface WeightSample {
  weightKg: number;
  loggedAt: string;
}

export type WeightProjection =
  /** Close enough to the goal that a date would be meaningless. */
  | { kind: 'reached' }
  /** Not enough history to say anything honest yet. */
  | { kind: 'insufficient_data' }
  /** Moving the wrong way, or too slowly to name a date without inventing one. */
  | { kind: 'no_estimate'; kgPerWeek: number }
  | { kind: 'on_track'; reachDate: Date; kgPerWeek: number };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Below this the goal counts as met — bathroom scales do not resolve finer than this day to day. */
const GOAL_TOLERANCE_KG = 0.5;

/** Two points a day apart say nothing about a trend; a week is the minimum honest window. */
const MIN_SPAN_DAYS = 7;

/**
 * Slower than this and the projected date is dominated by measurement noise
 * rather than real change, so no date is offered.
 */
const MIN_MEANINGFUL_KG_PER_WEEK = 0.05;

/** Past this the estimate is technically computable but not worth stating. */
const MAX_PROJECTION_DAYS = 3 * 365;

/**
 * Estimates when the user reaches their goal weight, from the rate their
 * logged weight has actually been changing.
 *
 * Deliberately conservative, and says "no estimate" readily. A projected
 * date carries a lot of implied authority, so it is only offered when the
 * data genuinely supports one: enough history, movement toward the goal
 * rather than away from it, and a rate fast enough not to be noise. A
 * confidently wrong "you'll get there on 31 Oct 2027" is worse than
 * admitting there isn't enough to go on.
 *
 * Uses first-versus-last over the window rather than a least-squares fit —
 * with a handful of noisy points the extra machinery would imply a
 * precision that isn't there.
 */
export function projectGoalDate(
  samples: WeightSample[],
  goalKg: number | null,
  now: Date = new Date(),
): WeightProjection {
  if (goalKg == null || samples.length === 0) return { kind: 'insufficient_data' };

  // Defensive sort — callers hold these newest-first in some places and
  // oldest-first in others.
  const ordered = [...samples].sort((a, b) => Date.parse(a.loggedAt) - Date.parse(b.loggedAt));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  const gap = last.weightKg - goalKg;
  if (Math.abs(gap) <= GOAL_TOLERANCE_KG) return { kind: 'reached' };

  if (ordered.length < 2) return { kind: 'insufficient_data' };

  const spanDays = (Date.parse(last.loggedAt) - Date.parse(first.loggedAt)) / MS_PER_DAY;
  if (!Number.isFinite(spanDays) || spanDays < MIN_SPAN_DAYS) return { kind: 'insufficient_data' };

  const kgPerDay = (last.weightKg - first.weightKg) / spanDays;
  const kgPerWeek = kgPerDay * 7;

  // Is the movement closing the gap? Losing weight helps only when the goal
  // is below the current weight, and vice versa.
  const movingTowardGoal = gap > 0 ? kgPerDay < 0 : kgPerDay > 0;
  if (!movingTowardGoal || Math.abs(kgPerWeek) < MIN_MEANINGFUL_KG_PER_WEEK) {
    return { kind: 'no_estimate', kgPerWeek };
  }

  const daysRemaining = Math.abs(gap / kgPerDay);
  if (daysRemaining > MAX_PROJECTION_DAYS) return { kind: 'no_estimate', kgPerWeek };

  return {
    kind: 'on_track',
    reachDate: new Date(now.getTime() + daysRemaining * MS_PER_DAY),
    kgPerWeek,
  };
}
