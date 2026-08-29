import type { NotificationCategory, NotificationPreferenceDto } from '@fitness-app/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Chip } from '../src/components/ui/Chip';
import { SkeletonBlock } from '../src/components/ui/SkeletonBlock';
import { Text } from '../src/components/ui/Text';
import { TextField } from '../src/components/ui/TextField';
import { TimeField } from '../src/components/ui/TimeField';
import {
  useCreateNotificationPreference,
  useDeleteNotificationPreference,
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from '../src/hooks/useNotificationPreferences';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { syncReminderDelivery } from '../src/lib/notifications';

const BUILT_IN_LABELS: Partial<Record<NotificationCategory, string>> = {
  water: 'Water',
  sleep: 'Bedtime',
  goal_progress: 'Meal logging',
};

/**
 * Presets cover the common case (someone wants a lunch nudge) in one tap,
 * while still allowing any wording. They are all meal_suggestion rows — the
 * category only decides fallback copy, and a labelled reminder always uses
 * its own label as the notification title.
 */
const LABEL_PRESETS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function ReminderRow({
  title,
  pref,
  onToggle,
  onTimeChange,
  onDelete,
}: {
  title: string;
  pref: NotificationPreferenceDto;
  onToggle: (enabled: boolean) => void;
  onTimeChange: (time: string) => void;
  onDelete?: () => void;
}) {
  return (
    <View className="gap-3 border-b border-gray-100 py-4 last:border-b-0 dark:border-gray-800">
      <View className="flex-row items-center justify-between gap-3">
        <Text variant="body" className="flex-1 font-semibold">
          {title}
        </Text>
        <Switch value={pref.enabled} onValueChange={onToggle} trackColor={{ true: '#12c06e' }} />
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <TimeField
          value={pref.preferredTime}
          onChange={onTimeChange}
          disabled={!pref.enabled}
          accessibilityLabel={`Change ${title} reminder time`}
        />
        {/* Built-in reminders get no delete affordance at all rather than a
            disabled one — there is nothing here the user can act on. */}
        {onDelete ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${title} reminder`} onPress={onDelete}>
            <Text className="text-sm font-semibold text-danger-600 dark:text-danger-400">Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function AddReminderForm({
  onCancel,
  onSubmit,
  isPending,
}: {
  onCancel: () => void;
  onSubmit: (label: string, time: string) => void;
  isPending: boolean;
}) {
  const [label, setLabel] = useState('');
  const [time, setTime] = useState<string | null>('13:00');

  const trimmed = label.trim();
  const isValid = trimmed.length > 0 && trimmed.length <= 40 && !!time;

  return (
    <Card className="gap-3">
      <Text variant="subtitle">New reminder</Text>

      <View className="flex-row flex-wrap gap-2">
        {LABEL_PRESETS.map((preset) => (
          <Chip key={preset} label={preset} selected={trimmed === preset} onPress={() => setLabel(preset)} />
        ))}
      </View>

      <TextField label="Name" value={label} onChangeText={setLabel} placeholder="e.g. Lunch" maxLength={40} />

      <View className="gap-1.5">
        <Text variant="caption">Time</Text>
        <TimeField value={time} onChange={setTime} accessibilityLabel="Choose reminder time" />
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button label="Cancel" variant="ghost" onPress={onCancel} />
        </View>
        <View className="flex-1">
          <Button
            label="Add"
            onPress={() => isValid && time && onSubmit(trimmed, time)}
            disabled={!isValid}
            loading={isPending}
          />
        </View>
      </View>
    </Card>
  );
}

export default function RemindersScreen() {
  const isAuthenticated = useRequireAuth();
  const preferences = useNotificationPreferences();
  const updatePreference = useUpdateNotificationPreference();
  const createPreference = useCreateNotificationPreference();
  const deletePreference = useDeleteNotificationPreference();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Any change to the list re-reconciles what the OS has scheduled.
  useEffect(() => {
    if (!preferences.data) return;
    void syncReminderDelivery(preferences.data.preferences);
  }, [preferences.data]);

  const report = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#12c06e" />
      </View>
    );
  }

  const all = preferences.data?.preferences ?? [];
  const builtIns = all.filter((p) => p.isBuiltIn && BUILT_IN_LABELS[p.category]);
  const custom = all.filter((p) => !p.isBuiltIn);

  return (
    <ScrollView className="flex-1 bg-surface-light dark:bg-surface-dark" contentContainerClassName="gap-4 p-5 pb-10">
      {error ? (
        <Text variant="caption" className="text-danger-600 dark:text-danger-400">
          {error}
        </Text>
      ) : null}

      {preferences.isLoading ? (
        <SkeletonBlock className="h-56 w-full" />
      ) : (
        <>
          <Card>
            <Text variant="subtitle" className="mb-1">
              Daily reminders
            </Text>
            <Text variant="caption" className="mb-1 text-gray-500 dark:text-gray-400">
              We&apos;ll send a notification at the time you pick.
            </Text>
            {builtIns.map((pref) => (
              <ReminderRow
                key={pref.id}
                title={BUILT_IN_LABELS[pref.category] ?? pref.category}
                pref={pref}
                onToggle={(enabled) => updatePreference.mutate({ id: pref.id, enabled }, { onError: report })}
                onTimeChange={(time) =>
                  updatePreference.mutate({ id: pref.id, preferredTime: time }, { onError: report })
                }
              />
            ))}
          </Card>

          {custom.length > 0 ? (
            <Card>
              <Text variant="subtitle" className="mb-1">
                Your reminders
              </Text>
              {custom.map((pref) => (
                <ReminderRow
                  key={pref.id}
                  title={pref.label ?? 'Reminder'}
                  pref={pref}
                  onToggle={(enabled) => updatePreference.mutate({ id: pref.id, enabled }, { onError: report })}
                  onTimeChange={(time) =>
                    updatePreference.mutate({ id: pref.id, preferredTime: time }, { onError: report })
                  }
                  onDelete={() =>
                    Alert.alert('Remove reminder', `Stop reminding you about ${pref.label}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => deletePreference.mutate(pref.id, { onError: report }),
                      },
                    ])
                  }
                />
              ))}
            </Card>
          ) : null}

          {isAdding ? (
            <AddReminderForm
              isPending={createPreference.isPending}
              onCancel={() => setIsAdding(false)}
              onSubmit={(label, preferredTime) => {
                setError(null);
                createPreference.mutate(
                  { category: 'meal_suggestion', label, preferredTime, enabled: true },
                  { onSuccess: () => setIsAdding(false), onError: report },
                );
              }}
            />
          ) : (
            <Button label="Add reminder" variant="secondary" onPress={() => setIsAdding(true)} />
          )}
        </>
      )}
    </ScrollView>
  );
}
