import type { InsightCard as InsightCardData } from '@fitness-app/shared';
import { View } from 'react-native';
import { Text } from './ui/Text';

// Fully tinted panels per tone (not just a hairline accent) — insights are
// the app's "personality" moments, so they should feel like stickers, not
// system notices.
const TONE_STYLES: Record<InsightCardData['tone'], { container: string; text: string }> = {
  positive: {
    container: 'bg-primary-50 dark:bg-primary-900/30',
    text: 'text-primary-800 dark:text-primary-200',
  },
  neutral: {
    container: 'bg-white dark:bg-muted-dark',
    text: 'text-gray-700 dark:text-gray-200',
  },
  nudge: {
    container: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-200',
  },
};

export function InsightCard({ card }: { card: InsightCardData }) {
  const tone = TONE_STYLES[card.tone];
  return (
    <View className={`flex-row items-start gap-3 rounded-2xl px-4 py-3.5 ${tone.container}`}>
      <Text className="text-2xl">{card.emoji}</Text>
      <Text variant="body" className={`flex-1 font-semibold ${tone.text}`}>
        {card.message}
      </Text>
    </View>
  );
}
