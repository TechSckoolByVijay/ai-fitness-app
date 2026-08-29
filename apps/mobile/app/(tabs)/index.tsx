import { router } from 'expo-router';
import { Image, ScrollView, View } from 'react-native';
import { ActivityListItem } from '../../src/components/ActivityListItem';
import { InsightCard } from '../../src/components/InsightCard';
import { MealListItem } from '../../src/components/MealListItem';
import { WeekStrip } from '../../src/components/WeekStrip';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { SkeletonBlock } from '../../src/components/ui/SkeletonBlock';
import { Text } from '../../src/components/ui/Text';
import { TopInsetSpacer } from '../../src/components/ui/TopInsetSpacer';
import { VoiceButton } from '../../src/components/VoiceButton';
import { WaterCard } from '../../src/components/WaterCard';
import { useDashboard, useDashboardHistory } from '../../src/hooks/useDashboard';
import { useInsights } from '../../src/hooks/useInsights';
import { useMe } from '../../src/hooks/useMe';
import { getCaloriePace } from '../../src/utils/calorieProgress';
import { getCalorieStatusTone, TONE_STYLES } from '../../src/utils/statusTone';
import { computeLoggingStreak } from '../../src/utils/loggingStreak';

const STREAK_WINDOW_DAYS = 30;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getGreetingSubline(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Let's make today count 💪";
  if (hour < 17) return 'Keep the momentum going ⚡';
  return 'Strong finish to the day 🌙';
}

export default function HomeScreen() {
  const dashboard = useDashboard();
  const history = useDashboardHistory(STREAK_WINDOW_DAYS);
  const insights = useInsights();
  const me = useMe();
  const firstName = me.data?.name?.split(' ')[0];
  const primaryGoal = me.data?.goals.find((g) => g.isPrimary)?.type ?? null;
  const caloriePace =
    dashboard.data?.calorieTarget != null
      ? getCaloriePace(primaryGoal, dashboard.data.caloriesConsumed, dashboard.data.calorieTarget)
      : null;

  // The hero's colour is the primary signal that something needs attention,
  // so it's derived from the numbers rather than hardcoded to the brand green.
  const calorieTone = getCalorieStatusTone(
    primaryGoal,
    dashboard.data?.caloriesConsumed ?? 0,
    dashboard.data?.calorieTarget ?? null,
    caloriePace?.expectedByNow ?? 0,
  );
  const toneStyle = TONE_STYLES[calorieTone];
  const caloriesOver =
    dashboard.data?.calorieTarget != null
      ? Math.round(dashboard.data.caloriesConsumed - dashboard.data.calorieTarget)
      : 0;

  const historyDays = history.data?.days ?? [];
  const streak = computeLoggingStreak(historyDays);
  const weekDays = historyDays.slice(-7).map((d) => ({ date: d.date, logged: d.caloriesConsumed > 0 }));

  return (
    <View className="flex-1 bg-surface-light dark:bg-surface-dark">
      <ScrollView contentContainerClassName="gap-4 px-5 pb-4 pt-4" showsVerticalScrollIndicator={false}>
        <TopInsetSpacer />
        <View>
          <Text variant="title">
            {getGreeting()}
            {firstName ? `, ${firstName}` : ''} 👋
          </Text>
          <Text variant="body" className="mt-1 text-gray-500 dark:text-gray-400">
            {getGreetingSubline()}
          </Text>
        </View>

        {weekDays.length > 0 ? (
          <WeekStrip days={weekDays} streak={streak.current} bestInWindow={streak.bestInWindow} />
        ) : null}

        {dashboard.isLoading ? (
          <View className="gap-3">
            <SkeletonBlock className="h-40 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </View>
        ) : dashboard.data ? (
          <>
            <View className={`rounded-3xl p-6 shadow-md ${toneStyle.heroContainer}`}>
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] font-bold uppercase tracking-widest text-white/80">
                  Calories today
                </Text>
                {/* Colour alone can't carry this — the badge states the
                    status in words and a glyph too. */}
                <View className="flex-row items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1">
                  <Text className="text-[12px] font-bold text-white">{toneStyle.icon}</Text>
                  <Text className="text-[12px] font-bold uppercase tracking-wide text-white">
                    {toneStyle.label}
                  </Text>
                </View>
              </View>
              <View className="mt-2 flex-row items-baseline gap-2">
                <Text className="text-6xl font-extrabold tracking-tight text-white">
                  {Math.round(dashboard.data.caloriesConsumed)}
                </Text>
                <Text className="text-xl font-semibold text-white/80">
                  / {dashboard.data.calorieTarget ?? '—'} kcal
                </Text>
              </View>
              <View className="mt-4">
                <ProgressBar
                  value={dashboard.data.caloriesConsumed}
                  target={dashboard.data.calorieTarget}
                  colorClassName={toneStyle.heroBar}
                  trackClassName={toneStyle.heroTrack}
                  heightClassName="h-3.5"
                  markerClassName={toneStyle.heroMarker}
                  overflowClassName="bg-danger-950/70"
                  markerPct={
                    caloriePace && dashboard.data.calorieTarget
                      ? (caloriePace.expectedByNow / dashboard.data.calorieTarget) * 100
                      : undefined
                  }
                />
              </View>
              {/* Going past the whole day's budget is the one case that
                  outranks pace, so it gets said plainly instead of being
                  folded into a "you're ahead of pace" phrasing. */}
              {calorieTone === 'critical' ? (
                <Text className="mt-2.5 text-[15px] font-bold text-white">
                  {caloriesOver} kcal over today&apos;s budget.
                  <Text className="text-[12px] font-medium text-white/70"> · estimated</Text>
                </Text>
              ) : caloriePace ? (
                <Text className="mt-2.5 text-[14px] font-semibold text-white/90">
                  {caloriePace.message}
                  <Text className="text-[12px] text-white/60"> · estimated</Text>
                </Text>
              ) : null}
            </View>

            <View className="flex-row gap-4">
              <Card className="flex-1 bg-sky-50 dark:bg-sky-950/60">
                <Text className="text-2xl">🥩</Text>
                <Text className="mt-1 text-3xl font-extrabold tracking-tight text-sky-600 dark:text-sky-400">
                  {Math.round(dashboard.data.proteinConsumed)}
                  <Text className="text-base font-bold text-sky-600/70 dark:text-sky-400/70">
                    {' '}
                    / {dashboard.data.proteinTarget ?? '—'} g
                  </Text>
                </Text>
                <Text variant="caption" className="mt-0.5 font-bold text-sky-700/80 dark:text-sky-300/80">
                  Protein
                </Text>
                <View className="mt-2">
                  <ProgressBar
                    value={dashboard.data.proteinConsumed}
                    target={dashboard.data.proteinTarget}
                    colorClassName="bg-sky-500"
                    trackClassName="bg-sky-200/60 dark:bg-sky-900/60"
                  />
                </View>
              </Card>

              <Card className="flex-1 bg-amber-50 dark:bg-amber-950/60">
                <Text className="text-2xl">🔥</Text>
                <Text className="mt-1 text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                  {Math.round(dashboard.data.activeCalories)}
                  <Text className="text-base font-bold text-amber-600/70 dark:text-amber-400/70"> kcal</Text>
                </Text>
                <Text variant="caption" className="mt-0.5 font-bold text-amber-700/80 dark:text-amber-300/80">
                  Burned
                </Text>
                <Text variant="caption" className="mt-2 text-amber-700/70 dark:text-amber-300/70">
                  {Math.round(dashboard.data.exerciseDurationMin)} min active
                </Text>
              </Card>
            </View>

            <WaterCard consumedMl={dashboard.data.waterConsumedMl} targetMl={dashboard.data.waterTargetMl} />

            {insights.data && insights.data.cards.length > 0 ? (
              <View className="gap-2.5">
                {insights.data.cards.map((card) => (
                  <InsightCard key={card.id} card={card} />
                ))}
              </View>
            ) : null}

            <View>
              <Text variant="subtitle" className="mb-2.5">
                Today&apos;s Meals 🍽️
              </Text>
              {dashboard.data.meals.length === 0 ? (
                <Card className="items-center overflow-hidden p-0">
                  <Image
                    source={require('../../assets/photos/healthy-bowl.jpg')}
                    style={{ width: '100%', height: 130 }}
                    resizeMode="cover"
                    accessible={false}
                  />
                  <View className="items-center px-5 py-5">
                    <Text variant="subtitle" className="text-center">
                      Nothing logged yet
                    </Text>
                    <Text variant="caption" className="mt-1 text-center">
                      Tap the mic below and just say what you ate! 🎙️
                    </Text>
                  </View>
                </Card>
              ) : (
                <Card className="px-4 py-1">
                  {dashboard.data.meals.map((meal) => (
                    <MealListItem
                      key={meal.id}
                      time={meal.time}
                      summaryText={meal.summaryText}
                      calories={meal.calories}
                      onPress={() => router.push('/(tabs)/food')}
                    />
                  ))}
                </Card>
              )}
            </View>

            {dashboard.data.activities.length > 0 ? (
              <View>
                <Text variant="subtitle" className="mb-2.5">
                  Today&apos;s Activities 🏃
                </Text>
                <Card className="px-4 py-1">
                  {dashboard.data.activities.map((activity) => (
                    <ActivityListItem
                      key={activity.id}
                      time={activity.time}
                      summaryText={activity.summaryText}
                      caloriesBurned={activity.caloriesBurned}
                    />
                  ))}
                </Card>
              </View>
            ) : null}
          </>
        ) : (
          <EmptyState title="Couldn't load your dashboard" subtitle="Pull to refresh or try again shortly." />
        )}
      </ScrollView>

      <VoiceButton />
    </View>
  );
}
