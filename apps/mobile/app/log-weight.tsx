import { kgToDisplayWeight, UNIT_LABELS, type UnitSystem, weightInputToKg } from '@fitness-app/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { RulerPicker } from '../src/components/ui/RulerPicker';
import { Text } from '../src/components/ui/Text';
import { useMe } from '../src/hooks/useMe';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { useUnitSystem } from '../src/hooks/useUnitSystem';
import { useCreateWeightEntry } from '../src/hooks/useWeightEntries';
import { goBackOrHome } from '../src/utils/navigation';
import type { RulerConfig } from '../src/utils/ruler';

/**
 * Ranges are deliberately wide — a weight tracker that cannot represent its
 * user is useless — but bounded, so the ruler stays scrollable in a
 * reasonable number of flicks.
 */
const RULER_CONFIG: Record<UnitSystem, RulerConfig> = {
  metric: { min: 30, max: 250, step: 0.1 },
  // Whole pounds: a pound is already finer than 0.5kg, so a decimal here
  // would be false precision and would triple the tick count for nothing.
  imperial: { min: 66, max: 550, step: 1 },
};

const DEFAULT_KG = 70;

export default function LogWeightScreen() {
  const isAuthenticated = useRequireAuth();
  const createWeightEntry = useCreateWeightEntry();
  const me = useMe();
  const profileUnitSystem = useUnitSystem();

  // Local override so the toggle switches the scale in the moment without
  // changing the user's saved preference — matching the reference app.
  const [unitSystem, setUnitSystem] = useState<UnitSystem | null>(null);
  const activeUnit = unitSystem ?? profileUnitSystem;

  const startingKg = me.data?.profile.currentWeightKg ?? DEFAULT_KG;
  const [displayValue, setDisplayValue] = useState<number | null>(null);
  const value = displayValue ?? kgToDisplayWeight(startingKg, activeUnit);
  const [error, setError] = useState<string | null>(null);

  const switchUnit = (next: UnitSystem) => {
    if (next === activeUnit) return;
    // Carry the currently-shown weight across rather than resetting it —
    // convert to kg, then back into the new scale.
    const asKg = weightInputToKg(value, activeUnit);
    setUnitSystem(next);
    setDisplayValue(kgToDisplayWeight(asKg, next));
  };

  const submit = async () => {
    setError(null);
    try {
      await createWeightEntry.mutateAsync({
        weightKg: weightInputToKg(value, activeUnit),
        loggedAt: new Date().toISOString(),
      });
      goBackOrHome();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#12c06e" />
      </View>
    );
  }

  return (
    <View className="flex-1 justify-between bg-surface-light dark:bg-surface-dark p-5">
      <View className="gap-8">
        <Text variant="subtitle" className="text-center">
          What&apos;s your weight today?
        </Text>

        <View className="flex-row self-center rounded-full bg-muted-light p-1 dark:bg-muted-dark">
          {(['imperial', 'metric'] as const).map((system) => {
            const selected = activeUnit === system;
            return (
              <Pressable
                key={system}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => switchUnit(system)}
                className={`rounded-full px-6 py-1.5 ${selected ? 'bg-primary-500' : ''}`}
              >
                <Text
                  className={`text-sm font-bold ${
                    selected ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {UNIT_LABELS[system].weight}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <RulerPicker
          value={value}
          onChange={setDisplayValue}
          config={RULER_CONFIG[activeUnit]}
          unitLabel={UNIT_LABELS[activeUnit].weight}
        />

        {error ? (
          <Text variant="caption" className="text-center text-danger-600 dark:text-danger-400">
            {error}
          </Text>
        ) : null}
      </View>

      <Button label="Save" onPress={submit} loading={createWeightEntry.isPending} />
    </View>
  );
}
