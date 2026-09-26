import type { InterpretedWater } from '@fitness-app/shared';
import { View } from 'react-native';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

interface WaterInterpretationCardProps {
  water: InterpretedWater;
  isSubmitting: boolean;
  onConfirm: () => void;
  onRetype: () => void;
}

function formatAmount(ml: number): string {
  return ml >= 1000 ? `${Math.round(ml / 100) / 10} L` : `${ml} ml`;
}

export function WaterInterpretationCard({ water, isSubmitting, onConfirm, onRetype }: WaterInterpretationCardProps) {
  return (
    <Card className="gap-4">
      <View>
        <Text variant="caption">I understood:</Text>
        <Text variant="subtitle" className="mt-2">
          💧 {formatAmount(water.amountMl)} of water
        </Text>
        <Text variant="caption">Counts towards your water for the day, same as the Home card.</Text>
      </View>
      <View className="flex-row gap-3">
        <Button label="✓ Confirm" variant="cta" onPress={onConfirm} loading={isSubmitting} className="flex-1" />
        <Button label="Remove" variant="secondary" onPress={onRetype} disabled={isSubmitting} />
      </View>
    </Card>
  );
}
