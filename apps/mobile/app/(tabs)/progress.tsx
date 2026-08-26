import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SkeletonBlock } from '../../src/components/ui/SkeletonBlock';
import { Text } from '../../src/components/ui/Text';
import { TopInsetSpacer } from '../../src/components/ui/TopInsetSpacer';
import { useSleepEntries } from '../../src/hooks/useSleepEntries';
import { useWeightEntries } from '../../src/hooks/useWeightEntries';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ProgressScreen() {
  const weight = useWeightEntries();
  const sleep = useSleepEntries();

  const weightEntries = weight.data?.entries ?? [];
  const sleepEntries = sleep.data?.entries ?? [];
  const latestWeight = weightEntries[0];
  const previousWeight = weightEntries[1];
  const weightDelta =
    latestWeight && previousWeight ? Math.round((latestWeight.weightKg - previousWeight.weightKg) * 10) / 10 : null;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-surface-dark" contentContainerClassName="gap-5 p-5">
      <TopInsetSpacer />
      <Text variant="title">Progress</Text>

      <View>
        <View className="mb-2 flex-row items-center justify-between">
          <Text variant="subtitle">Weight</Text>
          <Button label="Log weight" variant="ghost" onPress={() => router.push('/log-weight')} />
        </View>
        {weight.isLoading ? (
          <SkeletonBlock className="h-24 w-full" />
        ) : weightEntries.length === 0 ? (
          <EmptyState
            emoji="⚖️"
            title="No weight logged yet"
            subtitle="Log your weight to start tracking your trend."
          />
        ) : (
          <Card>
            <View className="flex-row flex-wrap items-baseline gap-1.5">
              <Text className="text-3xl font-bold text-gray-900 dark:text-gray-50">{latestWeight.weightKg}</Text>
              <Text variant="body">kg</Text>
              {weightDelta !== null ? (
                <Text
                  variant="caption"
                  className={weightDelta <= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-amber-600 dark:text-amber-400'}
                >
                  {weightDelta > 0 ? '+' : ''}
                  {weightDelta} kg since last log
                </Text>
              ) : null}
            </View>
            <View className="mt-3 gap-2">
              {weightEntries.slice(0, 10).map((entry) => (
                <View
                  key={entry.id}
                  className="flex-row items-center justify-between border-b border-gray-100 py-2 last:border-b-0 dark:border-gray-800"
                >
                  <Text variant="caption">{formatDate(entry.loggedAt)}</Text>
                  <Text variant="body">{entry.weightKg} kg</Text>
                </View>
              ))}
            </View>
          </Card>
        )}
      </View>

      <View>
        <View className="mb-2 flex-row items-center justify-between">
          <Text variant="subtitle">Sleep</Text>
          <Button label="Log sleep" variant="ghost" onPress={() => router.push('/log-sleep')} />
        </View>
        {sleep.isLoading ? (
          <SkeletonBlock className="h-24 w-full" />
        ) : sleepEntries.length === 0 ? (
          <EmptyState
            emoji="😴"
            title="No sleep logged yet"
            subtitle="Log how you slept to start tracking patterns."
          />
        ) : (
          <Card className="px-4 py-1">
            {sleepEntries.slice(0, 10).map((entry) => (
              <View
                key={entry.id}
                className="flex-row items-center justify-between border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800"
              >
                <View className="gap-0.5">
                  <Text variant="caption">{formatDate(entry.wokeAt)}</Text>
                  <Text variant="body">Woke at {formatTime(entry.wokeAt)}</Text>
                </View>
                <Text variant="body" className="text-gray-500 dark:text-gray-400">
                  {(entry.durationMin / 60).toFixed(1)} h
                </Text>
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
