import type { FoodEntryDto } from '@fitness-app/shared';
import { Pressable, View } from 'react-native';
import { Text } from './ui/Text';
import { formatTime } from '../utils/date';

export function FoodHistoryItem({ entry, onPress }: { entry: FoodEntryDto; onPress: () => void }) {
  const summary = entry.items.map((item) => `${item.quantity} ${item.unit} ${item.name}`).join(' + ');

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800"
    >
      <View className="flex-1 gap-0.5 pr-3">
        <Text variant="caption">
          {formatTime(new Date(entry.loggedAt))} · <Text variant="caption" className="capitalize">{entry.mealType}</Text>
        </Text>
        <Text variant="body" className="font-medium capitalize">
          {summary}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text variant="body">{Math.round(entry.totals.calories)} kcal</Text>
        <Text variant="caption">{Math.round(entry.totals.proteinG)}g protein</Text>
      </View>
    </Pressable>
  );
}
