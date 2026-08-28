import type { HealthConditionType } from '@fitness-app/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { Chip } from '../src/components/ui/Chip';
import { Text } from '../src/components/ui/Text';
import { TextField } from '../src/components/ui/TextField';
import { useMe } from '../src/hooks/useMe';
import { useUpdateHealthConditions } from '../src/hooks/useOnboardingMutations';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { goBackOrHome } from '../src/utils/navigation';

const HEALTH_OPTIONS: { value: HealthConditionType; label: string }[] = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'blood_pressure', label: 'Blood pressure' },
  { value: 'cholesterol', label: 'Cholesterol' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'kidney', label: 'Kidney-related dietary restrictions' },
  { value: 'digestive', label: 'Digestive conditions' },
  { value: 'medications', label: 'Currently on medication' },
  { value: 'other', label: 'Other' },
];

export default function EditHealthConditionsScreen() {
  const isAuthenticated = useRequireAuth();
  const me = useMe();
  const updateHealthConditions = useUpdateHealthConditions();

  const [selected, setSelected] = useState<Set<HealthConditionType>>(new Set());
  const [otherText, setOtherText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!me.data || hydrated) return;
    setSelected(new Set(me.data.healthConditions.map((c) => c.type)));
    setOtherText(me.data.healthConditions.find((c) => c.type === 'other')?.otherText ?? '');
    setHydrated(true);
  }, [me.data, hydrated]);

  const toggle = (value: HealthConditionType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    const conditions = Array.from(selected).map((type) => ({
      type,
      otherText: type === 'other' ? otherText || undefined : undefined,
    }));
    try {
      await updateHealthConditions.mutateAsync({ conditions });
      goBackOrHome();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (!isAuthenticated || me.isLoading || !hydrated) {
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
      <ScrollView contentContainerClassName="gap-4 p-5">
        <Text variant="caption">
          Used for personalization and safety only. This app does not diagnose conditions or prescribe/modify
          medication.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {HEALTH_OPTIONS.map((opt) => (
            <Chip key={opt.value} label={opt.label} selected={selected.has(opt.value)} onPress={() => toggle(opt.value)} />
          ))}
        </View>

        {selected.has('other') ? (
          <TextField label="Tell us more" value={otherText} onChangeText={setOtherText} placeholder="Optional details" />
        ) : null}

        {error ? (
          <Text variant="caption" className="text-red-500">
            {error}
          </Text>
        ) : null}

        <Button label="Save" onPress={submit} loading={updateHealthConditions.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
