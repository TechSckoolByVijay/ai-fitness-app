import type { InterpretedMeal } from '@fitness-app/shared';
import { Pressable, View } from 'react-native';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Chip } from './ui/Chip';
import { Text } from './ui/Text';

interface InterpretationCardProps {
  meal: InterpretedMeal;
  isSubmitting: boolean;
  onConfirm: () => void;
  onAdjustQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onQuickOption: (option: string) => void;
  onRetype: () => void;
}

const TIER_COPY: Record<InterpretedMeal['tier'], { label: string; className: string }> = {
  high: { label: 'Logged automatically', className: 'text-primary-600 dark:text-primary-400' },
  medium: { label: 'Estimated meal — tap to edit', className: 'text-amber-600 dark:text-amber-400' },
  low: { label: 'Need a bit more detail', className: 'text-amber-600 dark:text-amber-400' },
};

export function InterpretationCard({
  meal,
  isSubmitting,
  onConfirm,
  onAdjustQuantity,
  onRemoveItem,
  onQuickOption,
  onRetype,
}: InterpretationCardProps) {
  const tierInfo = TIER_COPY[meal.tier];

  return (
    <Card className="gap-4">
      <View>
        <Text variant="caption">I understood:</Text>
        <View className="mt-2 gap-2">
          {meal.items.map((item, index) => (
            <View key={`${item.name}-${index}`} className="flex-row items-center justify-between">
              <Text variant="body" className="flex-1 capitalize">
                {item.quantity} {item.unit} {item.name}
              </Text>
              <View className="flex-row items-center gap-1">
                <Pressable
                  accessibilityLabel={`Decrease ${item.name} quantity`}
                  onPress={() => onAdjustQuantity(index, -1)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-muted-light dark:bg-muted-dark"
                >
                  <Text variant="body">−</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Increase ${item.name} quantity`}
                  onPress={() => onAdjustQuantity(index, 1)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-muted-light dark:bg-muted-dark"
                >
                  <Text variant="body">+</Text>
                </Pressable>
                {meal.items.length > 1 ? (
                  <Pressable
                    accessibilityLabel={`Remove ${item.name}`}
                    onPress={() => onRemoveItem(index)}
                    className="h-8 w-8 items-center justify-center rounded-full"
                  >
                    <Text variant="body" className="text-red-500">
                      ×
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="border-t border-gray-100 pt-3 dark:border-gray-800">
        <Text variant="subtitle">Estimated {Math.round(meal.estimatedTotals.calories)} kcal</Text>
        <Text variant="caption" className={tierInfo.className}>
          {tierInfo.label}
        </Text>
      </View>

      {meal.tier === 'low' && meal.clarifyingQuestion ? (
        <View className="gap-2">
          <Text variant="body">{meal.clarifyingQuestion}</Text>
          <View className="flex-row flex-wrap gap-2">
            {(meal.quickOptions ?? []).map((option) => (
              <Chip key={option} label={option} selected={false} onPress={() => onQuickOption(option)} />
            ))}
          </View>
          <Button label="Type it differently" variant="ghost" onPress={onRetype} />
        </View>
      ) : (
        <View className="flex-row gap-3">
          <Button label="Confirm" onPress={onConfirm} loading={isSubmitting} className="flex-1" />
          <Button label="Retype" variant="secondary" onPress={onRetype} disabled={isSubmitting} />
        </View>
      )}
    </Card>
  );
}
