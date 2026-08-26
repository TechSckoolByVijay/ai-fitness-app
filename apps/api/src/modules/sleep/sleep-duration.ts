/** Pure so it's unit-testable without a database — mirrors the calorie-burn module's pattern of never trusting client-computed derived numbers. */
export function computeSleepDurationMinutes(sleptAt: Date, wokeAt: Date): number {
  return Math.round((wokeAt.getTime() - sleptAt.getTime()) / 60_000);
}
