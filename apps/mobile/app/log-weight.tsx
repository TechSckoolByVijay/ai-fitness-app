import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { UNIT_LABELS, weightInputToKg } from '@fitness-app/shared';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { Text } from '../src/components/ui/Text';
import { TextField } from '../src/components/ui/TextField';
import { useCreateWeightEntry } from '../src/hooks/useWeightEntries';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { useUnitSystem } from '../src/hooks/useUnitSystem';
import { goBackOrHome } from '../src/utils/navigation';

export default function LogWeightScreen() {
  const isAuthenticated = useRequireAuth();
  const createWeightEntry = useCreateWeightEntry();
  const unitSystem = useUnitSystem();
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(weight);
  const isValid = weight.trim() !== '' && Number.isFinite(parsed) && parsed > 0;

  const submit = async () => {
    if (!isValid) return;
    setError(null);
    try {
      // Entry is in the user's chosen unit; storage is always kilograms.
      await createWeightEntry.mutateAsync({
        weightKg: weightInputToKg(parsed, unitSystem),
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-surface-light dark:bg-surface-dark"
    >
      <View className="gap-4 p-5">
        <Text variant="subtitle">What&apos;s your weight today?</Text>
        <TextField
          label={`Weight (${UNIT_LABELS[unitSystem].weight})`}
          value={weight}
          onChangeText={setWeight}
          placeholder={unitSystem === 'imperial' ? 'e.g. 155' : 'e.g. 70.5'}
          keyboardType="decimal-pad"
          autoFocus
        />
        {error ? (
          <Text variant="caption" className="text-red-500">
            {error}
          </Text>
        ) : null}
        <Button
          label="Log weight"
          onPress={submit}
          disabled={!isValid}
          loading={createWeightEntry.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
