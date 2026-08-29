import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useDisconnectHealth, useHealthConnections, useSyncHealthData } from '../hooks/useHealthConnect';
import { isHealthConnectSupported } from '../lib/healthConnect';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return then.toLocaleDateString();
}

/**
 * Connects the phone's Health Connect store so steps appear on Home.
 *
 * States the honest reason when it cannot work rather than showing a button
 * that silently does nothing — Health Connect is Android-only and needs a
 * build that includes the native module, so Expo Go and iOS both land here.
 */
export function HealthConnectCard() {
  const connections = useHealthConnections();
  const sync = useSyncHealthData();
  const disconnect = useDisconnectHealth();
  const [message, setMessage] = useState<string | null>(null);

  const supported = isHealthConnectSupported();
  const connection = connections.data?.connections.find((c) => c.provider === 'health_connect');
  const isConnected = connection?.status === 'connected';

  const unavailableReason =
    Platform.OS !== 'android'
      ? 'Health Connect is Android only. Apple Health support is not built yet.'
      : 'This build does not include Health Connect. It needs a development or production build, not Expo Go.';

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text variant="subtitle">Health Connect</Text>
          <Text variant="caption" className="mt-0.5 text-gray-500 dark:text-gray-400">
            {!supported
              ? unavailableReason
              : isConnected
                ? `Steps and distance from your phone · last synced ${formatSyncedAt(connection?.lastSyncedAt ?? null)}`
                : 'Bring in steps and distance from your phone.'}
          </Text>
        </View>
        {supported ? (
          <Button
            label={isConnected ? 'Sync' : 'Connect'}
            variant={isConnected ? 'ghost' : 'secondary'}
            loading={sync.isPending}
            onPress={() => {
              setMessage(null);
              sync.mutate(undefined, {
                onSuccess: (result) =>
                  setMessage(
                    result.daysStored > 0
                      ? `Synced ${result.daysStored} day${result.daysStored === 1 ? '' : 's'}.`
                      : 'No new health data on this device yet.',
                  ),
                onError: (error) => setMessage(error instanceof Error ? error.message : 'Sync failed.'),
              });
            }}
          />
        ) : null}
      </View>

      {message ? (
        <Text variant="caption" className="mt-2 text-gray-600 dark:text-gray-300">
          {message}
        </Text>
      ) : null}

      {supported && isConnected ? (
        <View className="mt-1 self-start">
          <Button
            label="Disconnect"
            variant="ghost"
            loading={disconnect.isPending}
            onPress={() => {
              setMessage(null);
              disconnect.mutate();
            }}
          />
        </View>
      ) : null}
    </Card>
  );
}
