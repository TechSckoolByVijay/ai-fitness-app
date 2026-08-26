import type { DietType } from '@fitness-app/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { Chip } from '../src/components/ui/Chip';
import { Text } from '../src/components/ui/Text';
import { TextField } from '../src/components/ui/TextField';
import { useMe } from '../src/hooks/useMe';
import { useUpdateDiet } from '../src/hooks/useOnboardingMutations';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { goBackOrHome } from '../src/utils/navigation';

const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'non_vegetarian', label: 'Non-vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'other', label: 'Other' },
];

export default function EditDietScreen() {
  const isAuthenticated = useRequireAuth();
  const me = useMe();
  const updateDiet = useUpdateDiet();

  const [dietType, setDietType] = useState<DietType | null>(null);
  const [otherText, setOtherText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!me.data || hydrated) return;
    setDietType(me.data.dietPreference?.dietType ?? null);
    setOtherText(me.data.dietPreference?.otherText ?? '');
    setHydrated(true);
  }, [me.data, hydrated]);

  const submit = async () => {
    if (!dietType) return;
    setError(null);
    try {
      await updateDiet.mutateAsync({ dietType, otherText: dietType === 'other' ? otherText : undefined });
      goBackOrHome();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (!isAuthenticated || me.isLoading || !hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#22b56d" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-surface-dark"
    >
      <ScrollView contentContainerClassName="gap-4 p-5">
        <View className="flex-row flex-wrap gap-2">
          {DIET_OPTIONS.map((opt) => (
            <Chip key={opt.value} label={opt.label} selected={dietType === opt.value} onPress={() => setDietType(opt.value)} />
          ))}
        </View>

        {dietType === 'other' ? (
          <TextField label="Tell us more" value={otherText} onChangeText={setOtherText} placeholder="e.g. Pescatarian" />
        ) : null}

        {error ? (
          <Text variant="caption" className="text-red-500">
            {error}
          </Text>
        ) : null}

        <Button label="Save" onPress={submit} disabled={!dietType} loading={updateDiet.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
