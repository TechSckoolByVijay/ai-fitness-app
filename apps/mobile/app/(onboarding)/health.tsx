import type { HealthConditionType } from '@fitness-app/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { Text } from '../../src/components/ui/Text';
import { TextField } from '../../src/components/ui/TextField';
import { useCompleteOnboarding, useUpdateHealthConditions } from '../../src/hooks/useOnboardingMutations';

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

export default function HealthStep() {
  const [selected, setSelected] = useState<Set<HealthConditionType>>(new Set());
  const [otherText, setOtherText] = useState('');
  const updateHealthConditions = useUpdateHealthConditions();
  const completeOnboarding = useCompleteOnboarding();

  const isPending = updateHealthConditions.isPending || completeOnboarding.isPending;

  const toggle = (value: HealthConditionType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const finish = async (preferNotToAnswer: boolean) => {
    const conditions = preferNotToAnswer
      ? []
      : Array.from(selected).map((type) => ({
          type,
          otherText: type === 'other' ? otherText || undefined : undefined,
        }));
    await updateHealthConditions.mutateAsync({ conditions, skipped: preferNotToAnswer });
    await completeOnboarding.mutateAsync();
    router.replace('/');
  };

  return (
    <OnboardingScaffold
      step={6}
      title="Anything we should know?"
      subtitle="Is there anything about your health we should consider when giving recommendations? This is completely optional and only used for personalization and safety."
      footer={
        <>
          <Button label="Finish" onPress={() => finish(false)} loading={isPending} />
          <Button label="Prefer not to answer" variant="ghost" onPress={() => finish(true)} disabled={isPending} />
        </>
      }
    >
      <View className="flex-row flex-wrap gap-2">
        {HEALTH_OPTIONS.map((opt) => (
          <Chip key={opt.value} label={opt.label} selected={selected.has(opt.value)} onPress={() => toggle(opt.value)} />
        ))}
      </View>

      {selected.has('other') ? (
        <TextField label="Tell us more" value={otherText} onChangeText={setOtherText} placeholder="Optional details" />
      ) : null}

      <Text variant="caption" className="mt-2">
        This app does not diagnose conditions or prescribe/modify medication. For medical advice, please
        consult your healthcare professional.
      </Text>
    </OnboardingScaffold>
  );
}
