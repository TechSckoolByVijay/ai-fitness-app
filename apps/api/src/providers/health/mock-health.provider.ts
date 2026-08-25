import type { HealthDataProvider } from './health-data-provider.interface';

/** Returns null/empty for everything — no fabricated device data. Not called by any Phase 1 route. */
export class MockHealthDataProvider implements HealthDataProvider {
  async getSteps(): Promise<number | null> {
    return null;
  }
  async getSleep(): Promise<{ durationMin: number } | null> {
    return null;
  }
  async getHeartRate(): Promise<{ restingBpm: number } | null> {
    return null;
  }
  async getActiveCalories(): Promise<number | null> {
    return null;
  }
  async getDistance(): Promise<number | null> {
    return null;
  }
  async getWeight(): Promise<number | null> {
    return null;
  }
  async getWorkouts(): Promise<Array<{ type: string; durationMin: number }>> {
    return [];
  }
}
