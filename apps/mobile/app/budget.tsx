import {
  DEFAULT_MACRO_SPLIT,
  macroGramsFor,
  MACRO_PCT_TOTAL,
  MAX_CUSTOM_CALORIES,
  MIN_CUSTOM_CALORIES,
  type MacroSplit,
  rebalanceMacros,
} from '@fitness-app/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Slider } from '../src/components/ui/Slider';
import { Text } from '../src/components/ui/Text';
import { useMe } from '../src/hooks/useMe';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { useUpdateBudget } from '../src/hooks/useBudget';
import { goBackOrHome } from '../src/utils/navigation';

const MACRO_ROWS = [
  { key: 'carbPct', label: 'Carbs', emoji: '🥬', color: 'bg-primary-500' },
  { key: 'fatPct', label: 'Fat', emoji: '🧈', color: 'bg-caution-500' },
  { key: 'proteinPct', label: 'Protein', emoji: '🥩', color: 'bg-sky-500' },
] as const;

function ModeCard({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-1 rounded-2xl border p-4 ${
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-muted-dark'
      }`}
    >
      <Text variant="body" className={selected ? 'font-bold text-primary-800 dark:text-primary-200' : 'font-bold'}>
        {title}
      </Text>
      <Text variant="caption" className="mt-0.5 text-gray-500 dark:text-gray-400">
        {subtitle}
      </Text>
    </Pressable>
  );
}

export default function BudgetScreen() {
  const isAuthenticated = useRequireAuth();
  const me = useMe();
  const updateBudget = useUpdateBudget();
  const [error, setError] = useState<string | null>(null);

  const profile = me.data?.profile;
  const [isCustom, setIsCustom] = useState<boolean | null>(null);
  const custom = isCustom ?? profile?.useCustomTargets ?? false;

  const [calories, setCalories] = useState<number | null>(null);
  const [macros, setMacros] = useState<MacroSplit | null>(null);

  if (!isAuthenticated || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#12c06e" />
      </View>
    );
  }

  const calorieValue = calories ?? profile.calorieTarget ?? 2000;
  const macroValue = macros ?? profile.macros ?? DEFAULT_MACRO_SPLIT;
  const grams = macroGramsFor(calorieValue, macroValue);
  const gramsByKey = {
    carbPct: grams.carbGrams,
    fatPct: grams.fatGrams,
    proteinPct: grams.proteinGrams,
  };

  const save = () => {
    setError(null);
    const payload = custom
      ? ({ mode: 'custom', calorieTarget: calorieValue, macros: macroValue } as const)
      : ({ mode: 'standard' } as const);

    updateBudget.mutate(payload, {
      onSuccess: () => goBackOrHome(),
      onError: (err) =>
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'),
    });
  };

  return (
    <View className="flex-1 justify-between bg-surface-light dark:bg-surface-dark">
      <ScrollView contentContainerClassName="gap-4 p-5">
        <View className="flex-row gap-3">
          <ModeCard
            title="Standard"
            subtitle="Calculated for you"
            selected={!custom}
            onPress={() => setIsCustom(false)}
          />
          <ModeCard title="Custom" subtitle="Set by you" selected={custom} onPress={() => setIsCustom(true)} />
        </View>

        <Card className="gap-4">
          <View>
            <View className="flex-row items-baseline justify-between">
              <Text variant="subtitle">Calorie intake</Text>
              <Text variant="caption" className="text-gray-500 dark:text-gray-400">
                {custom ? `${MIN_CUSTOM_CALORIES}–${MAX_CUSTOM_CALORIES} kcal` : 'From your body info and goal'}
              </Text>
            </View>
            <View className="mt-1 flex-row items-baseline gap-1.5">
              <Text className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                {calorieValue}
              </Text>
              <Text variant="body" className="font-semibold text-gray-500 dark:text-gray-400">
                kcal/day
              </Text>
            </View>
          </View>

          {custom ? (
            <Slider
              value={calorieValue}
              min={MIN_CUSTOM_CALORIES}
              max={MAX_CUSTOM_CALORIES}
              onChange={setCalories}
              accessibilityLabel="Daily calorie target"
            />
          ) : (
            <View className="gap-1">
              {/* "1699 kcal" is meaningless without saying what it is made of.
                  Spelled out because a target you do not understand is a
                  target you do not trust. */}
              <Text variant="caption" className="text-gray-500 dark:text-gray-400">
                This is what your body burns in a day — the energy it uses just staying alive, worked
                out from your age, sex, height and weight, then scaled for how active you are.
              </Text>
              <Text variant="caption" className="text-gray-500 dark:text-gray-400">
                {profile.useCustomTargets
                  ? 'Your goal adjustment is not applied to a custom target.'
                  : 'Your goal then adjusts it — lower to lose weight, higher to gain.'}{' '}
                Recalculated whenever your weight, body info, or goal changes.
              </Text>
            </View>
          )}
        </Card>

        <Card className="gap-3">
          <Text variant="subtitle">Macro split</Text>
          {MACRO_ROWS.map((row) => (
            <View key={row.key} className="gap-1">
              <View className="flex-row items-baseline justify-between">
                <Text variant="body" className="font-semibold">
                  {row.emoji} {row.label}
                </Text>
                <Text variant="caption" className="font-bold text-gray-700 dark:text-gray-200">
                  {macroValue[row.key]}% · {gramsByKey[row.key]}g
                </Text>
              </View>
              {custom ? (
                <Slider
                  value={macroValue[row.key]}
                  min={0}
                  max={MACRO_PCT_TOTAL}
                  colorClassName={row.color}
                  // Moving one macro absorbs the difference across the other
                  // two, so the split always totals 100.
                  onChange={(next) => setMacros(rebalanceMacros(macroValue, row.key, next))}
                  accessibilityLabel={`${row.label} percentage`}
                />
              ) : null}
            </View>
          ))}
          {!custom ? (
            <Text variant="caption" className="text-gray-500 dark:text-gray-400">
              Switch to Custom to adjust your macro split.
            </Text>
          ) : null}
        </Card>

        {error ? (
          <Text variant="caption" className="text-danger-600 dark:text-danger-400">
            {error}
          </Text>
        ) : null}

        <Text variant="caption" className="text-gray-500 dark:text-gray-400">
          {MIN_CUSTOM_CALORIES} kcal is the lowest target this app will set. Very low intakes are not
          something to attempt without medical supervision.
        </Text>
      </ScrollView>

      <View className="p-5 pt-0">
        <Button label="Save" onPress={save} loading={updateBudget.isPending} />
      </View>
    </View>
  );
}
