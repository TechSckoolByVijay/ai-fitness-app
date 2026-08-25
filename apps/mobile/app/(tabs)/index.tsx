import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { ActivityListItem } from '../../src/components/ActivityListItem';
import { MealListItem } from '../../src/components/MealListItem';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { SkeletonBlock } from '../../src/components/ui/SkeletonBlock';
import { Text } from '../../src/components/ui/Text';
import { VoiceButton } from '../../src/components/VoiceButton';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useMe } from '../../src/hooks/useMe';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const dashboard = useDashboard();
  const me = useMe();
  const firstName = me.data?.name?.split(' ')[0];

  return (
    <View className="flex-1 bg-white dark:bg-surface-dark">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text variant="title">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ''} 👋
        </Text>

        {dashboard.isLoading ? (
          <View className="gap-3">
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </View>
        ) : dashboard.data ? (
          <>
            <Card>
              <Text variant="caption">Calories</Text>
              <View className="mt-1 flex-row items-baseline gap-1.5">
                <Text className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                  {Math.round(dashboard.data.caloriesConsumed)}
                </Text>
                <Text variant="body">/ {dashboard.data.calorieTarget ?? '—'} kcal</Text>
              </View>
              <View className="mt-3">
                <ProgressBar value={dashboard.data.caloriesConsumed} target={dashboard.data.calorieTarget} />
              </View>
              <Text variant="caption" className="mt-1.5">
                Estimated calories
              </Text>
            </Card>

            <Card>
              <Text variant="caption">Protein</Text>
              <View className="mt-1 flex-row items-baseline gap-1.5">
                <Text className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
                  {Math.round(dashboard.data.proteinConsumed)}
                </Text>
                <Text variant="body">/ {dashboard.data.proteinTarget ?? '—'} g</Text>
              </View>
              <View className="mt-3">
                <ProgressBar
                  value={dashboard.data.proteinConsumed}
                  target={dashboard.data.proteinTarget}
                  colorClassName="bg-blue-400"
                />
              </View>
            </Card>

            {dashboard.data.activeCalories > 0 || dashboard.data.exerciseDurationMin > 0 ? (
              <Card>
                <Text variant="caption">Active calories</Text>
                <View className="mt-1 flex-row items-baseline gap-1.5">
                  <Text className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
                    {Math.round(dashboard.data.activeCalories)}
                  </Text>
                  <Text variant="body">kcal burned</Text>
                </View>
                <Text variant="caption" className="mt-1.5">
                  {Math.round(dashboard.data.exerciseDurationMin)} min of activity today
                </Text>
              </Card>
            ) : null}

            <View>
              <Text variant="subtitle" className="mb-2">
                Today&apos;s Meals
              </Text>
              {dashboard.data.meals.length === 0 ? (
                <EmptyState emoji="🍽️" title="Start by telling me what you ate." />
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
                <Text variant="subtitle" className="mb-2">
                  Today&apos;s Activities
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
