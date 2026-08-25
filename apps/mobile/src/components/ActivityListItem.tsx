import { Pressable, View } from 'react-native';
import { Text } from './ui/Text';

interface ActivityListItemProps {
  time: string;
  summaryText: string;
  caloriesBurned: number;
  onPress?: () => void;
}

export function ActivityListItem({ time, summaryText, caloriesBurned, onPress }: ActivityListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800"
    >
      <View className="flex-1 gap-0.5">
        <Text variant="caption">{time}</Text>
        <Text variant="body" className="font-medium capitalize">
          {summaryText}
        </Text>
      </View>
      <Text variant="body" className="text-primary-600 dark:text-primary-400">
        −{Math.round(caloriesBurned)} kcal
      </Text>
    </Pressable>
  );
}
