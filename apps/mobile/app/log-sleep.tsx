import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { Chip } from '../src/components/ui/Chip';
import { Text } from '../src/components/ui/Text';
import { TextField } from '../src/components/ui/TextField';
import { useCreateSleepEntry } from '../src/hooks/useSleepEntries';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { goBackOrHome } from '../src/utils/navigation';

const HOURS_QUICK_PICKS = ['6', '7', '7.5', '8', '9'];

function formatNowAsHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** Combines today's date with an "HH:MM" 24-hour local time into a Date. */
function combineTodayWithTime(hhmm: string): Date | null {
  const match = hhmm.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const result = new Date();
  result.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return result;
}

export default function LogSleepScreen() {
  const isAuthenticated = useRequireAuth();
  const createSleepEntry = useCreateSleepEntry();
  const [wakeTime, setWakeTime] = useState(formatNowAsHHMM());
  const [hoursSlept, setHoursSlept] = useState('8');
  const [error, setError] = useState<string | null>(null);

  const wokeAt = combineTodayWithTime(wakeTime);
  const parsedHours = Number(hoursSlept);
  const isValid = wokeAt !== null && Number.isFinite(parsedHours) && parsedHours > 0 && parsedHours <= 24;

  const submit = async () => {
    if (!isValid || !wokeAt) return;
    setError(null);
    const sleptAt = new Date(wokeAt.getTime() - parsedHours * 60 * 60 * 1000);
    try {
      await createSleepEntry.mutateAsync({ sleptAt: sleptAt.toISOString(), wokeAt: wokeAt.toISOString() });
      goBackOrHome();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#22b56d" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-surface-dark"
    >
      <View className="gap-4 p-5">
        <Text variant="subtitle">How did you sleep?</Text>

        <TextField
          label="Wake time (24-hour, e.g. 06:30)"
          value={wakeTime}
          onChangeText={setWakeTime}
          placeholder="06:30"
          keyboardType="numbers-and-punctuation"
        />

        <TextField
          label="Hours slept"
          value={hoursSlept}
          onChangeText={setHoursSlept}
          placeholder="8"
          keyboardType="decimal-pad"
        />
        <View className="flex-row flex-wrap gap-2">
          {HOURS_QUICK_PICKS.map((hours) => (
            <Chip
              key={hours}
              label={`${hours} h`}
              selected={hoursSlept === hours}
              onPress={() => setHoursSlept(hours)}
            />
          ))}
        </View>

        {error ? (
          <Text variant="caption" className="text-red-500">
            {error}
          </Text>
        ) : null}

        <Button label="Log sleep" onPress={submit} disabled={!isValid} loading={createSleepEntry.isPending} />
      </View>
    </KeyboardAvoidingView>
  );
}
