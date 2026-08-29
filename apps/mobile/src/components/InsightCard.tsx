import type { InsightCard as InsightCardData } from '@fitness-app/shared';
import { View } from 'react-native';
import { TONE_STYLES, type StatusTone } from '../utils/statusTone';
import { Text } from './ui/Text';

// Fully tinted panels per tone (not just a hairline accent) — insights are
// the app's "personality" moments, so they should feel like stickers, not
// system notices.
//
// The actual colours come from the app-wide tone system rather than a table
// local to this file, so an insight nudge and a calorie warning can't drift
// into looking like different severities of the same thing.
const INSIGHT_TONE_TO_STATUS: Record<InsightCardData['tone'], StatusTone> = {
  positive: 'positive',
  neutral: 'neutral',
  nudge: 'caution',
};

export function InsightCard({ card }: { card: InsightCardData }) {
  const status = INSIGHT_TONE_TO_STATUS[card.tone];
  const tone = TONE_STYLES[status];
  return (
    <View className={`flex-row items-start gap-3 rounded-2xl px-4 py-3.5 ${tone.softContainer}`}>
      <Text className="text-2xl">{card.emoji}</Text>
      <Text variant="body" className={`flex-1 font-semibold ${tone.softText}`}>
        {card.message}
      </Text>
      {/* The API picks the emoji for personality, and a cheerful one (🎯, 📝)
          reads nothing like a warning. This glyph is driven by severity
          rather than copy, so a nudge always carries a visible warning mark. */}
      {status !== 'neutral' ? (
        <Text className={`text-base font-black ${tone.softIcon}`}>{tone.icon}</Text>
      ) : null}
    </View>
  );
}
