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
    <Card className="bg-sky-50 dark:bg-sky-950/60">
      <Text className="text-2xl">💧</Text>
      <View className="mt-1 flex-row items-baseline gap-1.5">
        <Text className="text-3xl font-extrabold tracking-tight text-sky-600 dark:text-sky-400">
          {formatLiters(consumedMl)}
        </Text>
        <Text className="text-base font-bold text-sky-600/70 dark:text-sky-400/70">
          / {targetMl ? formatLiters(targetMl) : '—'} L
        </Text>
      </View>
      <Text variant="caption" className="mt-0.5 font-bold text-sky-700/80 dark:text-sky-300/80">
        Water
      </Text>
      <View className="mt-2.5">
        <ProgressBar
          value={consumedMl}
          target={targetMl}
          colorClassName="bg-sky-500"
          trackClassName="bg-sky-200/60 dark:bg-sky-900/60"
        />
      </View>
      <View className="mt-3 flex-row gap-2.5">
        {QUICK_ADD_AMOUNTS_ML.map((amount) => (
          <Button
            key={amount}
            label={`+${amount} ml`}
            variant="secondary"
            onPress={() => addWater(amount)}
            loading={createWaterEntry.isPending}
            className="min-h-[48px] flex-1 bg-white dark:bg-sky-900/50"
          />
        ))}
      </View>
    </Card>
  );
}
