export interface HistoryDayLike {
  date: string;
  caloriesConsumed: number;
}

export interface LoggingStreak {
  /** Consecutive days with something logged, ending today (or yesterday if today is still empty — the day isn't over, so an empty today doesn't break the streak yet). */
  current: number;
  /** Longest run anywhere in the window — "personal best" within the fetched history. */
  bestInWindow: number;
}

/**
 * A *logging* streak (did you show up and log anything), not a goal-hit
 * streak — deliberately the easiest streak to keep alive, because the habit
 * we're rewarding for retention is opening the app and logging at all.
 * `days` must be ordered oldest-first and end with today.
 */
export function computeLoggingStreak(days: HistoryDayLike[]): LoggingStreak {
  const logged = days.map((d) => d.caloriesConsumed > 0);

  let bestInWindow = 0;
  let run = 0;
  for (const isLogged of logged) {
    run = isLogged ? run + 1 : 0;
    bestInWindow = Math.max(bestInWindow, run);
  }

  let current = 0;
  let i = logged.length - 1;
  // An empty today is "not yet", not "missed" — start counting from yesterday.
  if (i >= 0 && !logged[i]) i--;
  for (; i >= 0 && logged[i]; i--) current++;

  return { current, bestInWindow };
}
