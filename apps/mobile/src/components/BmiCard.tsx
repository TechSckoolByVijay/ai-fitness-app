import { View } from 'react-native';
import { computeBmi } from '../utils/bmi';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

interface BmiCardProps {
  heightCm: number | null | undefined;
  weightKg: number | null | undefined;
}

const CATEGORY_COLORS: Record<string, string> = {
  underweight: '#38bdf8',
  healthy: '#12c06e',
  overweight: '#f59e0b',
  obese: '#f43f5e',
};

// Segment widths mirror the 15-40 scale: <18.5 / 18.5-25 / 25-30 / 30+.
const SCALE_SEGMENTS = [
  { flex: 14, color: '#38bdf8' },
  { flex: 26, color: '#12c06e' },
  { flex: 20, color: '#f59e0b' },
  { flex: 40, color: '#f43f5e' },
];

/**
 * Always-on BMI readout, recomputed from the latest weight (weight logging
 * updates the profile's current weight, so this stays fresh automatically).
 * Educational framing only — shows the standard ranges, never advice.
 */
export function BmiCard({ heightCm, weightKg }: BmiCardProps) {
  const bmi = heightCm && weightKg ? computeBmi(heightCm, weightKg) : null;
  if (!bmi) return null;

  const color = CATEGORY_COLORS[bmi.category];

  return (
    <Card>
      <View className="flex-row items-end justify-between">
        <View>
          <Text variant="caption" className="font-bold uppercase tracking-widest text-[12px]">
            Your BMI
          </Text>
          <Text className="mt-1 text-5xl font-extrabold tracking-tight" style={{ color }}>
            {bmi.value}
          </Text>
        </View>
        <View className="rounded-full px-3.5 py-1.5" style={{ backgroundColor: `${color}22` }}>
          <Text className="text-sm font-bold" style={{ color }}>
            {bmi.label}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <View className="h-3 flex-row overflow-hidden rounded-full">
          {SCALE_SEGMENTS.map((seg, i) => (
            <View key={i} style={{ flex: seg.flex, backgroundColor: seg.color }} />
          ))}
        </View>
        <View
          className="absolute -top-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-gray-900 dark:border-gray-900 dark:bg-white"
          style={{ left: `${Math.min(96, Math.max(0, bmi.scalePct))}%` }}
        />
        <View className="mt-1.5 flex-row justify-between">
          <Text variant="caption" className="text-[11px]">
            15
          </Text>
          <Text variant="caption" className="text-[11px]">
            18.5
          </Text>
          <Text variant="caption" className="text-[11px]">
            25
          </Text>
          <Text variant="caption" className="text-[11px]">
            30
          </Text>
          <Text variant="caption" className="text-[11px]">
            40
          </Text>
        </View>
      </View>
      <Text variant="caption" className="mt-2 text-[12px]">
        Updates automatically whenever you log a new weight.
      </Text>
    </Card>
  );
}
