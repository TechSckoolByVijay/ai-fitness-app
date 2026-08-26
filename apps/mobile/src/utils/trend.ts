export interface TrendSummary {
  average: number;
  direction: 'up' | 'down' | 'flat';
  changePct: number;
}

/**
 * Compares the average of the first half of a value series to the second
 * half, so the Progress tab can state a plain-English direction ("rising",
 * "declining") instead of expecting the user to read the bar chart shape
 * themselves.
 */
export function summarizeTrend(values: number[]): TrendSummary {
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  if (values.length < 4) {
    return { average, direction: 'flat', changePct: 0 };
  }

  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid);
  const secondHalf = values.slice(mid);
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const changePct = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : secondAvg > 0 ? 100 : 0;

  let direction: TrendSummary['direction'] = 'flat';
  if (changePct > 5) direction = 'up';
  else if (changePct < -5) direction = 'down';

  return { average, direction, changePct };
}
