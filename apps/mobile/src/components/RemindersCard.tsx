import type { NotificationCategory } from '@fitness-app/shared';
import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { useNotificationPreferences, useUpdateNotificationPreference } from '../hooks/useNotificationPreferences';
import { syncScheduledReminders } from '../lib/notifications';
import { Card } from './ui/Card';
import { SkeletonBlock } from './ui/SkeletonBlock';
import { Text } from './ui/Text';
import { TextField } from './ui/TextField';

const REMINDER_CATEGORIES: Array<{ category: NotificationCategory; label: string }> = [
  { category: 'water', label: 'Water reminder' },
  { category: 'sleep', label: 'Bedtime reminder' },
  { category: 'goal_progress', label: 'Meal logging reminder' },
];

interface ReminderRowProps {
  label: string;
  enabled: boolean;
  preferredTime: string | null;
  onToggle: (enabled: boolean) => void;
  onCommitTime: (time: string) => void;
}

function ReminderRow({ label, enabled, preferredTime, onToggle, onCommitTime }: ReminderRowProps) {
  const [timeDraft, setTimeDraft] = useState(preferredTime ?? '');

  useEffect(() => {
    setTimeDraft(preferredTime ?? '');
  }, [preferredTime]);

  return (
    <View className="gap-2 border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800">
      <View className="flex-row items-center justify-between">
        <Text variant="body" className="font-medium">
          {label}
        </Text>
        <Switch value={enabled} onValueChange={onToggle} trackColor={{ true: '#12c06e' }} />
      </View>
      {enabled ? (
        <TextField
          label="Preferred time (24-hour, e.g. 21:00)"
          value={timeDraft}
          onChangeText={setTimeDraft}
          onBlur={() => timeDraft !== (preferredTime ?? '') && onCommitTime(timeDraft)}
          placeholder="21:00"
          keyboardType="numbers-and-punctuation"
        />
      ) : null}
    </View>
  );
}

export function RemindersCard() {
  const preferences = useNotificationPreferences();
  const updatePreference = useUpdateNotificationPreference();

  useEffect(() => {
    if (!preferences.data) return;
    void syncScheduledReminders(preferences.data.preferences);
  }, [preferences.data]);

  return (
    <Card>
      <Text variant="subtitle" className="mb-1">
        Reminders
      </Text>
      <Text variant="caption" className="mb-2">
        Set when you&apos;d like a nudge — we&apos;ll send a notification at that time.
      </Text>

      {preferences.isLoading || !preferences.data ? (
        <SkeletonBlock className="h-24 w-full" />
      ) : (
        REMINDER_CATEGORIES.map(({ category, label }) => {
          const pref = preferences.data.preferences.find((p) => p.category === category);
          return (
            <ReminderRow
              key={category}
              label={label}
              enabled={pref?.enabled ?? true}
              preferredTime={pref?.preferredTime ?? null}
              onToggle={(enabled) =>
                updatePreference.mutate({ category, enabled, preferredTime: pref?.preferredTime ?? undefined })
              }
              onCommitTime={(time) => {
                if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
                  updatePreference.mutate({ category, enabled: pref?.enabled ?? true, preferredTime: time });
                }
              }}
            />
          );
        })
      )}
    </Card>
  );
}
