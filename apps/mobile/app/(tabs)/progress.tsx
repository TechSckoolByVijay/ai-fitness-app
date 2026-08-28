import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SkeletonBlock } from '../../src/components/ui/SkeletonBlock';
import { Text } from '../../src/components/ui/Text';
import { TopInsetSpacer } from '../../src/components/ui/TopInsetSpacer';
import { TrendBarChart } from '../../src/components/ui/TrendBarChart';
import { useDashboardHistory } from '../../src/hooks/useDashboard';
import { useSleepEntries } from '../../src/hooks/useSleepEntries';
import { useWeightEntries } from '../../src/hooks/useWeightEntries';
import { summarizeTrend } from '../../src/utils/trend';

const HISTORY_DAYS = 14;

function dayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' });
}

function trendSentence(direction: 'up' | 'down' | 'flat', changePct: number): string {
  if (direction === 'flat') return 'holding steady over the last 2 weeks';
  const magnitude = Math.abs(Math.round(changePct));
  const word = direction === 'up' ? 'trending up' : 'trending down';
  return `${word} ${magnitude}% vs. the first week`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ProgressScreen() {
  const weight = useWeightEntries();
  const sleep = useSleepEntries();
  const history = useDashboardHistory(HISTORY_DAYS);

  const weightEntries = weight.data?.entries ?? [];
  const sleepEntries = sleep.data?.entries ?? [];
  const latestWeight = weightEntries[0];
  const previousWeight = weightEntries[1];
  const weightDelta =
    latestWeight && previousWeight ? Math.round((latestWeight.weightKg - previousWeight.weightKg) * 10) / 10 : null;

  const historyDays = history.data?.days ?? [];
  const hasAnyHistory = historyDays.some((d) => d.caloriesConsumed > 0);
  const calorieTrend = summarizeTrend(historyDays.map((d) => d.caloriesConsumed));
  const proteinTrend = summarizeTrend(historyDays.map((d) => d.proteinConsumed));
  const calorieTarget = history.data?.calorieTarget ?? null;
  const proteinTarget = history.data?.proteinTarget ?? null;
  const daysUnderCalorieTarget = calorieTarget
    ? historyDays.filter((d) => d.caloriesConsumed > 0 && d.caloriesConsumed <= calorieTarget).length
    : 0;
  const daysLoggedWithTarget = calorieTarget ? historyDays.filter((d) => d.caloriesConsumed > 0).length : 0;

  return (
    <ScrollView className="flex-1 bg-surface-light dark:bg-surface-dark" contentContainerClassName="gap-5 p-5">
      <TopInsetSpacer />
      <Text variant="title">Progress</Text>

      <View>
        <Text variant="subtitle" className="mb-2">
          Calorie intake
        </Text>
        {history.isLoading ? (
          <SkeletonBlock className="h-36 w-full" />
        ) : !hasAnyHistory ? (
          <EmptyState
            emoji="📈"
            title="No meals logged yet this period"
            subtitle="Log a few meals and your calorie trend will show up here."
          />
        ) : (
          <Card className="gap-3">
            <View>
              <Text className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {Math.round(calorieTrend.average)}
                <Text variant="caption"> avg kcal/day</Text>
              </Text>
              <Text variant="caption">{trendSentence(calorieTrend.direction, calorieTrend.changePct)}</Text>
              {calorieTarget && daysLoggedWithTarget > 0 ? (
                <Text variant="caption">
                  Under your {calorieTarget} kcal target on {daysUnderCalorieTarget} of {daysLoggedWithTarget} logged
                  days
                </Text>
              ) : null}
            </View>
            <TrendBarChart
              data={historyDays.map((d) => ({ label: dayLabel(d.date), value: d.caloriesConsumed }))}
              target={calorieTarget}
            />
            {calorieTarget ? (
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-1">
                  <View className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                  <Text variant="caption">At or under target</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <Text variant="caption">Over target</Text>
                </View>
              </View>
            ) : null}
          </Card>
        )}
      </View>

      <View>
        <Text variant="subtitle" className="mb-2">
          Protein intake
        </Text>
        {history.isLoading ? (
          <SkeletonBlock className="h-36 w-full" />
        ) : !hasAnyHistory ? (
          <EmptyState
            emoji="🥩"
            title="No meals logged yet this period"
            subtitle="Log a few meals and your protein trend will show up here."
          />
        ) : (
          <Card className="gap-3">
            <View>
              <Text className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {Math.round(proteinTrend.average)}
                <Text variant="caption"> avg g/day</Text>
              </Text>
              <Text variant="caption">{trendSentence(proteinTrend.direction, proteinTrend.changePct)}</Text>
            </View>
            <TrendBarChart
              data={historyDays.map((d) => ({ label: dayLabel(d.date), value: d.proteinConsumed }))}
              target={proteinTarget}
              barColorClassName="bg-sky-500"
              overTargetColorClassName="bg-sky-500"
            />
          </Card>
        )}
      </View>

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
