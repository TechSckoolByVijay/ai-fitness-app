import { View } from 'react-native';

interface ProgressBarProps {
  value: number;
  target: number | null;
  colorClassName?: string;
}

export function ProgressBar({ value, target, colorClassName = 'bg-primary-500' }: ProgressBarProps) {
  const pct = target && target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

  return (
    <View className="h-2.5 w-full overflow-hidden rounded-full bg-muted-light dark:bg-muted-dark">
      <View className={`h-full rounded-full ${colorClassName}`} style={{ width: `${pct}%` }} />
    </View>
  );
}
