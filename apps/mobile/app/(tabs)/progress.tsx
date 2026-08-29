import { kgToDisplayWeight, kgToLb, UNIT_LABELS } from '@fitness-app/shared';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { BmiCard } from '../../src/components/BmiCard';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LineChart } from '../../src/components/ui/LineChart';
import { SkeletonBlock } from '../../src/components/ui/SkeletonBlock';
import { Text } from '../../src/components/ui/Text';
import { TopInsetSpacer } from '../../src/components/ui/TopInsetSpacer';
import { useUnitSystem } from '../../src/hooks/useUnitSystem';
import { useDashboardHistory } from '../../src/hooks/useDashboard';
import { useMe } from '../../src/hooks/useMe';
import { useSleepEntries } from '../../src/hooks/useSleepEntries';
import { useWeightEntries } from '../../src/hooks/useWeightEntries';
import { summarizeTrend } from '../../src/utils/trend';

const HISTORY_DAYS = 14;
// Below this many logged days, averages and "trending up X%" are noise, not
// insight — show an encouraging progress-to-unlock line instead.
const MIN_DAYS_FOR_TRENDS = 4;

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
  const me = useMe();
  const weight = useWeightEntries();
  const sleep = useSleepEntries();
  const history = useDashboardHistory(HISTORY_DAYS);

  const weightEntries = weight.data?.entries ?? [];
  const sleepList = sleep.data?.entries ?? [];
  const latestWeight = weightEntries[0];
  const previousWeight = weightEntries[1];
  const weightDelta =
    latestWeight && previousWeight ? Math.round((latestWeight.weightKg - previousWeight.weightKg) * 10) / 10 : null;

  const historyDays = history.data?.days ?? [];
  // A day with nothing logged is a GAP in the chart, never a zero — zero
  // would read as "ate nothing", which is exactly the wrong assumption.
  const caloriePoints = historyDays.map((d) => ({
    label: dayLabel(d.date),
    value: d.caloriesConsumed > 0 ? d.caloriesConsumed : null,
  }));
  const proteinPoints = historyDays.map((d) => ({
    label: dayLabel(d.date),
    value: d.caloriesConsumed > 0 ? d.proteinConsumed : null,
  }));
  const loggedDays = historyDays.filter((d) => d.caloriesConsumed > 0);
  const hasEnoughForTrends = loggedDays.length >= MIN_DAYS_FOR_TRENDS;
  const calorieTrend = summarizeTrend(historyDays.map((d) => d.caloriesConsumed));
  const proteinTrend = summarizeTrend(historyDays.map((d) => d.proteinConsumed));
  const loggedCalorieAvg =
    loggedDays.length > 0 ? loggedDays.reduce((s, d) => s + d.caloriesConsumed, 0) / loggedDays.length : 0;
  const loggedProteinAvg =
    loggedDays.length > 0 ? loggedDays.reduce((s, d) => s + d.proteinConsumed, 0) / loggedDays.length : 0;
  const calorieTarget = history.data?.calorieTarget ?? null;
  const proteinTarget = history.data?.proteinTarget ?? null;

  const heightCm = me.data?.profile.heightCm ?? null;
  const currentWeightKg = latestWeight?.weightKg ?? me.data?.profile.currentWeightKg ?? null;

  const unitSystem = useUnitSystem();
  // The chart's y-axis has to be in the same unit as its formatted labels,
  // so points are converted from stored kg before plotting.
  const weightAxisValue = (kg: number) => (unitSystem === 'imperial' ? kgToLb(kg) : kg);
  const weightChartPoints = [...weightEntries]
    .slice(0, 15)
    .reverse()
    .map((entry) => ({ label: formatDate(entry.loggedAt), value: entry.weightKg }));

  return (
    <ScrollView className="flex-1 bg-surface-light dark:bg-surface-dark" contentContainerClassName="gap-5 p-5">
      <TopInsetSpacer />
      <Text variant="title">Progress 📈</Text>

      <BmiCard heightCm={heightCm} weightKg={currentWeightKg} />

      <View>
        <Text variant="subtitle" className="mb-2.5">
          Calories
        </Text>
        {history.isLoading ? (
          <SkeletonBlock className="h-36 w-full" />
        ) : loggedDays.length === 0 ? (
          <EmptyState
            emoji="📈"
            title="No meals logged yet this period"
            subtitle="Log a few meals and your calorie trend will show up here."
          />
        ) : (
          <Card className="gap-3">
            <View>
              <Text className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                {Math.round(loggedCalorieAvg)}
                <Text variant="caption"> avg kcal on logged days</Text>
              </Text>
              <Text variant="caption" className="mt-0.5">
                {hasEnoughForTrends
                  ? trendSentence(calorieTrend.direction, calorieTrend.changePct)
                  : `${loggedDays.length} of ${MIN_DAYS_FOR_TRENDS} days logged — trends unlock soon, keep going! 🔓`}
              </Text>
            </View>
            <LineChart points={caloriePoints} target={calorieTarget} colorHex="#12c06e" />
            <Text variant="caption" className="text-[12px]">
              Gaps mean nothing was logged that day — never assumed as zero.
            </Text>
          </Card>
        )}
      </View>

      <View>
        <Text variant="subtitle" className="mb-2.5">
          Protein
        </Text>
        {history.isLoading ? (
          <SkeletonBlock className="h-36 w-full" />
        ) : loggedDays.length === 0 ? (
          <EmptyState
            emoji="🥩"
            title="No meals logged yet this period"
            subtitle="Log a few meals and your protein trend will show up here."
          />
        ) : (
          <Card className="gap-3">
            <View>
              <Text className="text-4xl font-extrabold tracking-tight text-sky-600 dark:text-sky-400">
                {Math.round(loggedProteinAvg)}
                <Text variant="caption"> avg g on logged days</Text>
              </Text>
              {hasEnoughForTrends ? (
                <Text variant="caption" className="mt-0.5">
                  {trendSentence(proteinTrend.direction, proteinTrend.changePct)}
                </Text>
              ) : null}
            </View>
            <LineChart points={proteinPoints} target={proteinTarget} colorHex="#0ea5e9" />
          </Card>
        )}
      </View>

      <View>
        <View className="mb-2.5 flex-row items-center justify-between">
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
          <Card className="gap-3">
            <View className="flex-row flex-wrap items-baseline gap-1.5">
              <Text className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                {kgToDisplayWeight(latestWeight.weightKg, unitSystem)}
              </Text>
              <Text variant="body" className="font-bold">
                {UNIT_LABELS[unitSystem].weight}
              </Text>
              {weightDelta !== null ? (
                <Text
                  variant="caption"
                  className={weightDelta <= 0 ? 'font-bold text-primary-600 dark:text-primary-400' : 'font-bold text-amber-600 dark:text-amber-400'}
                >
                  {weightDelta > 0 ? '+' : ''}
                  {kgToDisplayWeight(weightDelta, unitSystem)} {UNIT_LABELS[unitSystem].weight} since last log
                </Text>
              ) : null}
            </View>
            {weightChartPoints.length >= 2 ? (
              <LineChart
                points={weightChartPoints.map((p) => ({ ...p, value: weightAxisValue(p.value) }))}
                colorHex="#8b5cf6"
                minRange={2}
                // v is already in display units (see weightAxisValue), so this
                // labels it rather than converting a second time.
                formatValue={(v) => `${Math.round(v * 10) / 10} ${UNIT_LABELS[unitSystem].weight}`}
              />
            ) : (
              <Text variant="caption">Log your weight a few more times to see the trend line.</Text>
            )}
          </Card>
        )}
      </View>

      <View>
        <View className="mb-2.5 flex-row items-center justify-between">
          <Text variant="subtitle">Sleep</Text>
          <Button label="Log sleep" variant="ghost" onPress={() => router.push('/log-sleep')} />
        </View>
        {sleep.isLoading ? (
          <SkeletonBlock className="h-24 w-full" />
        ) : sleepList.length === 0 ? (
          <EmptyState
            emoji="😴"
            title="No sleep logged yet"
            subtitle="Log how you slept to start tracking patterns."
          />
        ) : (
          <Card className="px-4 py-1">
            {sleepList
              .slice(0, 10)
              .map((entry) => (
                <View
                  key={entry.id}
                  className="flex-row items-center justify-between border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800"
                >
                  <View className="gap-0.5">
                    <Text variant="caption">{formatDate(entry.wokeAt)}</Text>
                    <Text variant="body">Woke at {formatTime(entry.wokeAt)}</Text>
                  </View>
                  <Text variant="body" className="font-bold text-gray-500 dark:text-gray-400">
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
