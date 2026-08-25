import type { Env } from '../../config/env';
import type { HealthDataProvider } from './health-data-provider.interface';
import { MockHealthDataProvider } from './mock-health.provider';

/** Always returns the mock in Phase 1 — Health Connect wiring is Phase 4. */
export function createHealthDataProvider(_env: Env): HealthDataProvider {
  return new MockHealthDataProvider();
}
