import type { InsightCard as InsightCardData } from '@fitness-app/shared';
import { View } from 'react-native';
import { Text } from './ui/Text';

const TONE_BORDER: Record<InsightCardData['tone'], string> = {
  positive: 'border-l-primary-500',
  neutral: 'border-l-gray-300 dark:border-l-gray-600',
  nudge: 'border-l-amber-500',
};

export function InsightCard({ card }: { card: InsightCardData }) {
  return (
    <View
      className={`flex-row items-start gap-3 rounded-xl border border-gray-100 border-l-4 bg-white px-4 py-3 dark:border-gray-800 dark:bg-muted-dark ${TONE_BORDER[card.tone]}`}
    >
      <Text className="text-lg">{card.emoji}</Text>
      <Text variant="body" className="flex-1">
        {card.message}
      </Text>
    </View>
  );
}
