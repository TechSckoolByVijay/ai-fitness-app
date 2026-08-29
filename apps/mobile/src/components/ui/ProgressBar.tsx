import { View } from 'react-native';

interface ProgressBarProps {
  value: number;
  target: number | null;
  colorClassName?: string;
  /** Track (background) color — override for tinted/hero surfaces. */
  trackClassName?: string;
  /** Bar thickness class, e.g. "h-3.5" for hero cards. */
  heightClassName?: string;
  /** 0-100 — draws a thin marker line at this position, e.g. "where you'd typically be by this time of day". Omit for a plain bar. */
  markerPct?: number;
  /** Marker line color — override on dark/colored surfaces. */
  markerClassName?: string;
  /**
   * Fill for the portion beyond `target`. Passing this opts the bar into
   * showing overage at all; without it the bar just saturates at 100% and
   * "exactly on target" looks the same as "double the target".
   */
  overflowClassName?: string;
}

export function ProgressBar({
  value,
  target,
  colorClassName = 'bg-primary-500',
  trackClassName = 'bg-muted-light dark:bg-muted-dark',
  heightClassName = 'h-2.5',
  markerPct,
  markerClassName = 'bg-gray-900/60 dark:bg-gray-50/60',
  overflowClassName,
}: ProgressBarProps) {
  const ratio = target && target > 0 ? value / target : 0;
  const pct = Math.min(100, Math.round(ratio * 100));

  // How far past the target the user has gone, as a share of the bar. Capped
  // at the full width so a wildly-over day still renders inside the track
  // (at 2x target the overflow band covers the whole bar).
  const overflowPct = overflowClassName && ratio > 1 ? Math.min(100, Math.round((ratio - 1) * 100)) : 0;

  return (
    <View className={`${heightClassName} w-full overflow-hidden rounded-full ${trackClassName}`}>
      <View className={`h-full rounded-full ${colorClassName}`} style={{ width: `${pct}%` }} />
      {overflowPct > 0 ? (
        <View
          className={`absolute top-0 h-full rounded-full ${overflowClassName}`}
          style={{ right: 0, width: `${overflowPct}%` }}
        />
      ) : null}
      {markerPct !== undefined ? (
        <View
          className={`absolute top-0 h-full w-[2px] ${markerClassName}`}
          style={{ left: `${Math.min(100, Math.max(0, markerPct))}%` }}
        />
      ) : null}
    </View>
  );
}
