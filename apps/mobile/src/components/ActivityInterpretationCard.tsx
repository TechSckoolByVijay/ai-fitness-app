import type { InterpretedActivity } from '@fitness-app/shared';
import { View } from 'react-native';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

interface ActivityInterpretationCardProps {
  activity: InterpretedActivity;
  isSubmitting: boolean;
  onConfirm: () => void;
  onRetype: () => void;
}

const TIER_COPY: Record<InterpretedActivity['tier'], { label: string; className: string }> = {
  high: { label: 'Logged automatically', className: 'text-primary-600 dark:text-primary-400' },
  medium: { label: 'Estimated activity — tap confirm to log', className: 'text-amber-600 dark:text-amber-400' },
  low: { label: 'Need a bit more detail — confirm if this looks right', className: 'text-amber-600 dark:text-amber-400' },
};

function formatActivityLabel(activityType: string): string {
  return activityType.replace(/_/g, ' ');
}

export function ActivityInterpretationCard({
  activity,
  isSubmitting,
  onConfirm,
  onRetype,
}: ActivityInterpretationCardProps) {
  const tierInfo = TIER_COPY[activity.tier];

  return (
    <Card className="gap-4">
      <View>
        <Text variant="caption">I understood:</Text>
        <Text variant="body" className="mt-2 capitalize">
          {formatActivityLabel(activity.activityType)} for {Math.round(activity.durationMinutes)} min
          {activity.steps ? ` (${activity.steps} steps)` : ''}
          {activity.distanceKm ? ` · ${activity.distanceKm} km` : ''}
        </Text>
        {activity.intensity ? (
          <Text variant="caption" className="capitalize">
            {activity.intensity} intensity
          </Text>
        ) : null}
      </View>

      <View className="border-t border-gray-100 pt-3 dark:border-gray-800">
        <Text variant="subtitle">{Math.round(activity.caloriesBurned)} kcal burned</Text>
        <Text variant="caption" className={tierInfo.className}>
          {tierInfo.label}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Button label="✓ Confirm" variant="cta" onPress={onConfirm} loading={isSubmitting} className="flex-1" />
        <Button label="Retype" variant="secondary" onPress={onRetype} disabled={isSubmitting} />
      </View>
    </Card>
  );
}
