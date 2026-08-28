import { computeLoggingStreak, type HistoryDayLike } from './loggingStreak';

function days(...calories: number[]): HistoryDayLike[] {
  return calories.map((caloriesConsumed, i) => ({ date: `2026-08-${String(i + 1).padStart(2, '0')}`, caloriesConsumed }));
}

describe('computeLoggingStreak', () => {
  it('returns zeros for an empty history', () => {
    expect(computeLoggingStreak([])).toEqual({ current: 0, bestInWindow: 0 });
  });

  it('counts consecutive logged days ending today', () => {
    const result = computeLoggingStreak(days(0, 1800, 1900, 2000));
    expect(result.current).toBe(3);
  });

  it('does not break the streak when today is still empty (day not over)', () => {
    const result = computeLoggingStreak(days(1800, 1900, 0));
    expect(result.current).toBe(2);
  });

  it('breaks the streak on a fully missed day before yesterday', () => {
    const result = computeLoggingStreak(days(1800, 0, 1900, 0));
    expect(result.current).toBe(1);
  });

  it('tracks the best run in the window even when the current streak is shorter', () => {
    const result = computeLoggingStreak(days(1800, 1900, 2000, 2100, 0, 1500, 1600));
    expect(result.current).toBe(2);
    expect(result.bestInWindow).toBe(4);
  });

  it('returns zero current streak when both today and yesterday are empty', () => {
    const result = computeLoggingStreak(days(1800, 0, 0));
    expect(result.current).toBe(0);
  });
});
