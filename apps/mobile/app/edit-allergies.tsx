import type { AllergyType } from '@fitness-app/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { Chip } from '../src/components/ui/Chip';
import { Text } from '../src/components/ui/Text';
import { TextField } from '../src/components/ui/TextField';
import { useMe } from '../src/hooks/useMe';
import { useUpdateAllergies } from '../src/hooks/useOnboardingMutations';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { goBackOrHome } from '../src/utils/navigation';

const ALLERGY_OPTIONS: { value: AllergyType; label: string }[] = [
  { value: 'milk', label: 'Milk' },
  { value: 'lactose', label: 'Lactose' },
  { value: 'curd', label: 'Curd' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'nuts', label: 'Nuts' },
  { value: 'peanuts', label: 'Peanuts' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'other', label: 'Other' },
];

export default function EditAllergiesScreen() {
  const isAuthenticated = useRequireAuth();
  const me = useMe();
  const updateAllergies = useUpdateAllergies();

  const [selected, setSelected] = useState<Set<AllergyType>>(new Set());
  const [otherText, setOtherText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!me.data || hydrated) return;
    setSelected(new Set(me.data.allergies.map((a) => a.type)));
    setOtherText(me.data.allergies.find((a) => a.type === 'other')?.otherText ?? '');
    setHydrated(true);
  }, [me.data, hydrated]);

  const toggle = (value: AllergyType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    const allergies = Array.from(selected).map((type) => ({
      type,
      otherText: type === 'other' ? otherText || undefined : undefined,
    }));
    try {
      await updateAllergies.mutateAsync({ allergies });
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
        <Text variant="caption">Select all that apply. Leave everything unselected if none apply.</Text>
        <View className="flex-row flex-wrap gap-2">
          {ALLERGY_OPTIONS.map((opt) => (
            <Chip key={opt.value} label={opt.label} selected={selected.has(opt.value)} onPress={() => toggle(opt.value)} />
          ))}
        </View>

        {selected.has('other') ? (
          <TextField label="Tell us more" value={otherText} onChangeText={setOtherText} placeholder="e.g. Shellfish" />
        ) : null}

        {error ? (
          <Text variant="caption" className="text-red-500">
            {error}
          </Text>
        ) : null}

        <Button label="Save" onPress={submit} loading={updateAllergies.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
