import { router } from 'expo-router';
import { Image, ScrollView, View } from 'react-native';
import { ActivityListItem } from '../../src/components/ActivityListItem';
import { InsightCard } from '../../src/components/InsightCard';
import { TodaySummaryCard } from '../../src/components/TodaySummaryCard';
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
            <TodaySummaryCard
              goalType={primaryGoal}
              calorieTarget={dashboard.data.calorieTarget}
              caloriesConsumed={dashboard.data.caloriesConsumed}
              activeCalories={dashboard.data.activeCalories ?? 0}
              proteinTarget={dashboard.data.proteinTarget}
              proteinConsumed={dashboard.data.proteinConsumed}
            />

            {dashboard.data.steps != null ? (
              <Card className="bg-violet-50 dark:bg-violet-950/60">
                <View className="flex-row items-baseline justify-between">
                  <Text className="text-2xl">👟</Text>
                  <Text variant="caption" className="font-bold text-violet-700/80 dark:text-violet-300/80">
                    Steps
                  </Text>
                </View>
                <Text className="mt-1 text-3xl font-extrabold tracking-tight text-violet-600 dark:text-violet-400">
                  {dashboard.data.steps.toLocaleString()}
                  <Text className="text-base font-bold text-violet-600/70 dark:text-violet-400/70">
                    {' '}
                    / {dashboard.data.stepsTarget ?? '—'}
                  </Text>
                </Text>
                <View className="mt-2">
                  <ProgressBar
                    value={dashboard.data.steps}
                    target={dashboard.data.stepsTarget}
                    colorClassName="bg-violet-500"
                  />
                </View>
              </Card>
            ) : null}

            <Card className="bg-amber-50 dark:bg-amber-950/60">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl">🔥</Text>
                  <Text className="mt-1 text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                    {Math.round(dashboard.data.activeCalories)}
                    <Text className="text-base font-bold text-amber-600/70 dark:text-amber-400/70"> kcal</Text>
                  </Text>
                  <Text variant="caption" className="mt-0.5 font-bold text-amber-700/80 dark:text-amber-300/80">
                    Burned today
                  </Text>
                </View>
                <Text variant="caption" className="text-amber-700/70 dark:text-amber-300/70">
                  {Math.round(dashboard.data.exerciseDurationMin)} min active
                </Text>
              </View>
            </Card>

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
