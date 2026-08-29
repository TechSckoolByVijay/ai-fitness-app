import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { syncReminderDelivery } from '../lib/notifications';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { SkeletonBlock } from './ui/SkeletonBlock';
import { Text } from './ui/Text';

/**
 * Summary only — editing lives on the Reminders screen, because adding a
 * reminder needs a name and a time picker and that does not fit inline in
 * the Profile stack.
 *
 * This still owns the OS reconciliation: Profile is opened far more often
 * than the Reminders screen, so syncing here keeps scheduled notifications
 * in step with the server even when the user never opens the editor.
 */
export function RemindersCard() {
  const preferences = useNotificationPreferences();

  useEffect(() => {
    if (!preferences.data) return;
    void syncReminderDelivery(preferences.data.preferences);
  }, [preferences.data]);

  const active = preferences.data?.preferences.filter((p) => p.enabled && p.preferredTime) ?? [];

  return (
    <Card>
      <View className="mb-2 flex-row items-center justify-between">
        <Text variant="subtitle">Reminders</Text>
        <Button label="Edit" variant="ghost" onPress={() => router.push('/reminders')} />
      </View>

      {preferences.isLoading || !preferences.data ? (
        <SkeletonBlock className="h-6 w-40" />
      ) : (
        <Text variant="caption" className="text-gray-500 dark:text-gray-400">
          {active.length === 0
            ? 'No reminders switched on.'
            : `${active.length} reminder${active.length === 1 ? '' : 's'} on — ${active
                .map((p) => p.label ?? p.category.replace('_', ' '))
                .join(', ')}.`}
        </Text>
      )}
    </Card>
  );
}
