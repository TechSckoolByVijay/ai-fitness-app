import { View } from 'react-native';

interface ProgressBarProps {
  value: number;
  target: number | null;
  colorClassName?: string;
  /** 0-100 — draws a thin marker line at this position, e.g. "where you'd typically be by this time of day". Omit for a plain bar. */
  markerPct?: number;
}

export function ProgressBar({ value, target, colorClassName = 'bg-primary-500', markerPct }: ProgressBarProps) {
  const pct = target && target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

  return (
    <View className="h-2.5 w-full overflow-hidden rounded-full bg-muted-light dark:bg-muted-dark">
      <View className={`h-full rounded-full ${colorClassName}`} style={{ width: `${pct}%` }} />
      {markerPct !== undefined ? (
        <View
          className="absolute top-0 h-full w-[2px] bg-gray-900/60 dark:bg-gray-50/60"
          style={{ left: `${Math.min(100, Math.max(0, markerPct))}%` }}
        />
      ) : null}
    </View>
  );
}
