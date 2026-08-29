import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { disconnectHealthProvider, getHealthConnections, syncHealthData } from '../api/health.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';
import { isHealthConnectSupported, readRecentHealthDays, requestHealthPermissions } from '../lib/healthConnect';

export function useHealthConnections() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.healthConnections,
    queryFn: getHealthConnections,
    enabled: status === 'authenticated',
  });
}

/**
 * Connects (if needed), reads the device, and uploads.
 *
 * Returns the number of days stored so the UI can say something concrete
 * rather than a bare "done" — "synced 7 days" tells the user it worked.
 */
export function useSyncHealthData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!isHealthConnectSupported()) {
        throw new Error('Health Connect is not available in this build.');
      }
      const granted = await requestHealthPermissions();
      if (!granted) {
        throw new Error('Health Connect permission was not granted.');
      }
      const days = await readRecentHealthDays();
      if (days.length === 0) return { daysStored: 0 };
      return syncHealthData({ provider: 'health_connect', days });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.healthConnections });
      // Steps land on the dashboard, so it is now stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardToday });
    },
  });
}

export function useDisconnectHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disconnectHealthProvider('health_connect'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.healthConnections });
    },
  });
}
