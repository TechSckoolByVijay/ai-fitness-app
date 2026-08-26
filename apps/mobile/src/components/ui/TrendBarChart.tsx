import { View } from 'react-native';
import { Text } from './Text';

const CHART_HEIGHT = 110;

export interface TrendBarChartDatum {
  label: string;
  value: number;
}

interface TrendBarChartProps {
  data: TrendBarChartDatum[];
  target?: number | null;
  barColorClassName?: string;
  overTargetColorClassName?: string;
}

/**
 * Plain-View bar chart (no SVG / charting library) so this ships via OTA
 * update instead of requiring a native rebuild. Bars past the target render
 * in a second color so "am I over or under my goal" reads at a glance
 * without needing to read any numbers.
 */
export function TrendBarChart({
  data,
  target,
  barColorClassName = 'bg-primary-500',
  overTargetColorClassName = 'bg-amber-500',
}: TrendBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), target ?? 0, 1);
  const targetLineBottom = target ? (target / maxValue) * CHART_HEIGHT : null;

  return (
    <View>
      <View style={{ height: CHART_HEIGHT }} className="relative flex-row items-end gap-1">
        {targetLineBottom !== null ? (
          <View
            style={{ bottom: targetLineBottom }}
            className="absolute left-0 right-0 h-[1px] border-t border-dashed border-gray-400 dark:border-gray-500"
          />
        ) : null}
        {data.map((d, i) => {
          const barHeight = d.value > 0 ? Math.max(3, (d.value / maxValue) * CHART_HEIGHT) : 0;
          const isOverTarget = target != null && d.value > target;
          return (
            <View key={i} className="flex-1 items-center justify-end" style={{ height: CHART_HEIGHT }}>
              <View
                style={{ height: barHeight }}
                className={`w-full rounded-t-sm ${isOverTarget ? overTargetColorClassName : barColorClassName}`}
              />
            </View>
          );
        })}
      </View>
      <View className="mt-1 flex-row gap-1">
        {data.map((d, i) => (
          <View key={i} className="flex-1 items-center">
            <Text variant="caption" className="text-[10px]" numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
