/**
 * Architecture placeholder (spec section 20) — not wired into any Phase 1
 * route. Exists so Phase 4 (Android Health Connect, later Apple HealthKit)
 * can be added without refactoring the domain model or Home dashboard.
 */
export interface HealthDataProvider {
  getSteps(input: { date: string }): Promise<number | null>;
  getSleep(input: { date: string }): Promise<{ durationMin: number } | null>;
  getHeartRate(input: { date: string }): Promise<{ restingBpm: number } | null>;
  getActiveCalories(input: { date: string }): Promise<number | null>;
  getDistance(input: { date: string }): Promise<number | null>;
  getWeight(input: { date: string }): Promise<number | null>;
  getWorkouts(input: { date: string }): Promise<Array<{ type: string; durationMin: number }>>;
}
