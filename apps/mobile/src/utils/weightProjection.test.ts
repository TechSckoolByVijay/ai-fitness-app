import { projectGoalDate, type WeightSample } from './weightProjection';

const NOW = new Date('2026-08-29T00:00:00Z');

/** Builds a series ending today, one sample per week, losing `kgPerWeek` each week. */
function series(startKg: number, kgPerWeek: number, weeks: number): WeightSample[] {
  return Array.from({ length: weeks }, (_, i) => ({
    weightKg: Number((startKg + kgPerWeek * i).toFixed(2)),
    loggedAt: new Date(NOW.getTime() - (weeks - 1 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

describe('projectGoalDate', () => {
  it('says nothing without a goal or any samples', () => {
    expect(projectGoalDate([], 70, NOW).kind).toBe('insufficient_data');
    expect(projectGoalDate(series(90, -0.5, 4), null, NOW).kind).toBe('insufficient_data');
  });

  it('needs more than a single data point', () => {
    expect(projectGoalDate([{ weightKg: 90, loggedAt: NOW.toISOString() }], 70, NOW).kind).toBe(
      'insufficient_data',
    );
  });

  it('refuses to extrapolate from a window shorter than a week', () => {
    const twoDays: WeightSample[] = [
      { weightKg: 92, loggedAt: '2026-08-27T00:00:00Z' },
      { weightKg: 90, loggedAt: '2026-08-29T00:00:00Z' },
    ];
    // 1kg/day would project a wildly optimistic date from two days of noise.
    expect(projectGoalDate(twoDays, 70, NOW).kind).toBe('insufficient_data');
  });

  it('treats being within half a kilo of the goal as reached', () => {
    expect(projectGoalDate(series(70.3, -0.1, 4), 70, NOW).kind).toBe('reached');
  });

  it('projects a date when losing steadily toward a lower goal', () => {
    // 80kg now, losing 0.5kg/week, goal 75 -> about 10 weeks out.
    const result = projectGoalDate(series(84.5, -0.5, 10), 75, NOW);
    expect(result.kind).toBe('on_track');
    if (result.kind !== 'on_track') throw new Error('expected on_track');
    const weeksOut = (result.reachDate.getTime() - NOW.getTime()) / (7 * 24 * 60 * 60 * 1000);
    expect(weeksOut).toBeCloseTo(10, 0);
    expect(result.kgPerWeek).toBeCloseTo(-0.5, 1);
  });

  it('projects a date when gaining steadily toward a higher goal', () => {
    const result = projectGoalDate(series(60, 0.25, 8), 65, NOW);
    expect(result.kind).toBe('on_track');
  });

  it('gives no estimate when moving away from the goal', () => {
    // Gaining while the goal is below — a date here would be nonsense.
    const result = projectGoalDate(series(80, 0.4, 8), 70, NOW);
    expect(result.kind).toBe('no_estimate');
    if (result.kind !== 'no_estimate') throw new Error('expected no_estimate');
    expect(result.kgPerWeek).toBeGreaterThan(0);
  });

  it('gives no estimate when the change is too slow to be distinguishable from noise', () => {
    expect(projectGoalDate(series(80, -0.01, 10), 70, NOW).kind).toBe('no_estimate');
  });

  it('gives no estimate rather than a date years away', () => {
    // 0.06kg/week against a 30kg gap is ~10 years — computable, not worth stating.
    expect(projectGoalDate(series(100, -0.06, 12), 70, NOW).kind).toBe('no_estimate');
  });

  it('does not depend on the order samples arrive in', () => {
    const ordered = series(84.5, -0.5, 10);
    const reversed = [...ordered].reverse();
    expect(projectGoalDate(reversed, 75, NOW)).toEqual(projectGoalDate(ordered, 75, NOW));
  });
});
