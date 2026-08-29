import type { HealthConnectionResponse, SyncHealthDataRequest } from '@fitness-app/shared';
import { apiRequest } from './client';

export function syncHealthData(input: SyncHealthDataRequest) {
  return apiRequest<{ daysStored: number }>('/health/sync', { method: 'POST', body: input });
}

export function getHealthConnections() {
  return apiRequest<HealthConnectionResponse>('/health/connections');
}

export function disconnectHealthProvider(provider: 'health_connect' | 'apple_health') {
  return apiRequest<void>(`/health/connections/${provider}`, { method: 'DELETE' });
}
