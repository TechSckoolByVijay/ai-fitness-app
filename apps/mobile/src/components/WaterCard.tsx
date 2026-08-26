import { View } from 'react-native';
import { useCreateWaterEntry } from '../hooks/useWaterEntries';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { Text } from './ui/Text';

interface WaterCardProps {
  consumedMl: number;
  targetMl: number | null;
}

const QUICK_ADD_AMOUNTS_ML = [250, 500];

function formatLiters(ml: number): string {
  return (ml / 1000).toFixed(1);
}

export function WaterCard({ consumedMl, targetMl }: WaterCardProps) {
  const createWaterEntry = useCreateWaterEntry();

  const addWater = (amountMl: number) => {
    createWaterEntry.mutate({ amountMl, loggedAt: new Date().toISOString() });
  };

  return (
    <Card>
      <Text variant="caption">Water</Text>
      <View className="mt-1 flex-row items-baseline gap-1.5">
        <Text className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
          {formatLiters(consumedMl)}
        </Text>
        <Text variant="body">/ {targetMl ? formatLiters(targetMl) : '—'} L</Text>
      </View>
      <View className="mt-3">
        <ProgressBar value={consumedMl} target={targetMl} colorClassName="bg-sky-400" />
      </View>
      <View className="mt-3 flex-row gap-2">
        {QUICK_ADD_AMOUNTS_ML.map((amount) => (
          <Button
            key={amount}
            label={`+${amount} ml`}
            variant="secondary"
            onPress={() => addWater(amount)}
            loading={createWaterEntry.isPending}
            className="flex-1"
          />
        ))}
      </View>
    </Card>
  );
}
