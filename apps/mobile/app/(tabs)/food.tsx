import type { FoodEntryDto } from '@fitness-app/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { FavoritesRow } from '../../src/components/FavoritesRow';
import { FoodHistoryItem } from '../../src/components/FoodHistoryItem';
import { SuggestedMealsRow } from '../../src/components/SuggestedMealsRow';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SkeletonBlock } from '../../src/components/ui/SkeletonBlock';
import { Text } from '../../src/components/ui/Text';
import { TopInsetSpacer } from '../../src/components/ui/TopInsetSpacer';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useFoodEntries } from '../../src/hooks/useFoodEntries';
import { useFrequentMeals } from '../../src/hooks/useFrequentMeals';
import { dayLabel } from '../../src/utils/date';

interface DayGroup {
  label: string;
  key: string;
  entries: FoodEntryDto[];
}

function groupByDay(entries: FoodEntryDto[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const entry of entries) {
    const date = new Date(entry.loggedAt);
    const key = date.toDateString();
    if (!groups.has(key)) {
      groups.set(key, { key, label: dayLabel(date), entries: [] });
    }
    groups.get(key)!.entries.push(entry);
  }

  return Array.from(groups.values());
}

export default function FoodScreen() {
  const { data, isLoading } = useFoodEntries();
  const favorites = useFavorites();
  const frequentMeals = useFrequentMeals();
  const groups = useMemo(() => groupByDay(data?.entries ?? []), [data]);

  return (
    <View className="flex-1 bg-surface-light dark:bg-surface-dark">
      <ScrollView contentContainerClassName="gap-6 p-5" showsVerticalScrollIndicator={false}>
        <TopInsetSpacer />
        <Text variant="title">Food</Text>

        <FavoritesRow favorites={favorites.data?.favorites ?? []} />
        <SuggestedMealsRow frequentMeals={frequentMeals.data?.frequentMeals ?? []} />

        {isLoading ? (
          <View className="gap-3">
            <SkeletonBlock className="h-32 w-full" />
            <SkeletonBlock className="h-32 w-full" />
          </View>
        ) : groups.length === 0 ? (
          <EmptyState
            emoji="🍽️"
            title="No meals logged yet"
            subtitle="Use the microphone on Home to log your first meal."
          />
        ) : (
          groups.map((group) => (
            <View key={group.key}>
              <Text variant="subtitle" className="mb-2">
                {group.label}
              </Text>
              <Card className="px-4 py-1">
                {group.entries.map((entry) => (
                  <FoodHistoryItem key={entry.id} entry={entry} onPress={() => router.push(`/meal/${entry.id}`)} />
                ))}
              </Card>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
