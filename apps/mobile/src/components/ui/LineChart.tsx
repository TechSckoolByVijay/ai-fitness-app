import { useState } from 'react';
import { View } from 'react-native';
import { Text } from './Text';

export interface LinePoint {
  label: string;
  /** null = no data for this slot (e.g. nothing logged that day) — rendered as a gap, never as zero. */
  value: number | null;
}

interface LineChartProps {
  points: LinePoint[];
  /** Horizontal reference line (e.g. calorie target). */
  target?: number | null;
  colorHex?: string;
  height?: number;
  /** Minimum y-axis span — stops a near-flat series (e.g. weight 90.5→90.6) rendering as wild swings. */
  minRange?: number;
  formatValue?: (value: number) => string;
}

/**
 * Pure-View line chart (dots + rotated segment Views) — deliberately avoids
 * react-native-svg, which is a native module and would force every tester to
 * reinstall the APK instead of receiving this via OTA update. Fine for the
 * small (≤31-point) trend series this app charts.
 */
export function LineChart({
  points,
  target,
  colorHex = '#12c06e',
  height = 130,
  minRange = 0,
  formatValue = (v) => String(Math.round(v)),
}: LineChartProps) {
  const [width, setWidth] = useState(0);

  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (values.length === 0) return null;

  let min = Math.min(...values, ...(target != null ? [target] : []));
  let max = Math.max(...values, ...(target != null ? [target] : []));
  if (max - min < minRange) {
    const mid = (max + min) / 2;
    min = mid - minRange / 2;
    max = mid + minRange / 2;
  }
  const span = max - min || 1;
  const pad = span * 0.12;
  const yMin = min - pad;
  const ySpan = span + pad * 2;

  const xFor = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * width : width / 2);
  const yFor = (v: number) => height - ((v - yMin) / ySpan) * height;

  const plotted = points
    .map((p, i) => (p.value !== null ? { x: xFor(i), y: yFor(p.value), value: p.value } : null))
    .filter((p): p is { x: number; y: number; value: number } => p !== null);

  const segments: Array<{ midX: number; midY: number; length: number; angle: number }> = [];
  for (let i = 1; i < plotted.length; i++) {
    const a = plotted[i - 1];
    const b = plotted[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    segments.push({
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
      length: Math.sqrt(dx * dx + dy * dy),
      angle: Math.atan2(dy, dx),
    });
  }

  // At most ~7 x-labels so they never collide.
  const labelStep = Math.max(1, Math.ceil(points.length / 7));

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text variant="caption" className="text-[12px]">
          {formatValue(max)}
        </Text>
        {target != null ? (
          <Text variant="caption" className="text-[12px]">
            target {formatValue(target)}
          </Text>
        ) : null}
      </View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <>
            {target != null ? (
              <View
                className="absolute w-full bg-gray-400/50 dark:bg-gray-500/50"
                style={{ top: yFor(target), height: 1.5 }}
              />
            ) : null}
            {segments.map((s, i) => (
              <View
                key={`seg-${i}`}
                style={{
                  position: 'absolute',
                  left: s.midX - s.length / 2,
                  top: s.midY - 1.5,
                  width: s.length,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: colorHex,
                  transform: [{ rotate: `${s.angle}rad` }],
                }}
              />
            ))}
            {plotted.map((p, i) => (
              <View
                key={`dot-${i}`}
                style={{
                  position: 'absolute',
                  left: p.x - 4,
                  top: p.y - 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colorHex,
                  borderWidth: 2,
                  borderColor: '#ffffff',
                }}
              />
            ))}
          </>
        ) : null}
      </View>
      <View className="mt-1 flex-row justify-between">
        {points.map((p, i) =>
          i % labelStep === 0 || i === points.length - 1 ? (
            <Text key={`${p.label}-${i}`} variant="caption" className="text-[11px]">
              {p.label}
            </Text>
          ) : null,
        )}
      </View>
      <Text variant="caption" className="text-[12px]">
        {formatValue(yMin + pad < 0 ? 0 : min)}
      </Text>
    </View>
  );
}
