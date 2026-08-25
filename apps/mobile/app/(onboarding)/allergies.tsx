import type { AllergyType } from '@fitness-app/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { TextField } from '../../src/components/ui/TextField';
import { useUpdateAllergies } from '../../src/hooks/useOnboardingMutations';

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

export default function AllergiesStep() {
  const [selected, setSelected] = useState<Set<AllergyType>>(new Set());
  const [otherText, setOtherText] = useState('');
  const updateAllergies = useUpdateAllergies();

  const toggle = (value: AllergyType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const submit = async (skip: boolean) => {
    const allergies = skip
      ? []
      : Array.from(selected).map((type) => ({
          type,
          otherText: type === 'other' ? otherText || undefined : undefined,
        }));
    await updateAllergies.mutateAsync({ allergies });
    router.push('/health');
  };

  return (
    <OnboardingScaffold
      step={5}
      title="Any allergies or intolerances?"
      subtitle="This helps us keep suggestions safe for you. Select all that apply."
      footer={
        <>
          <Button label="Continue" onPress={() => submit(false)} loading={updateAllergies.isPending} />
          <Button label="Skip" variant="ghost" onPress={() => submit(true)} disabled={updateAllergies.isPending} />
        </>
      }
    >
      <View className="flex-row flex-wrap gap-2">
        {ALLERGY_OPTIONS.map((opt) => (
          <Chip key={opt.value} label={opt.label} selected={selected.has(opt.value)} onPress={() => toggle(opt.value)} />
        ))}
      </View>

      {selected.has('other') ? (
        <TextField label="Tell us more" value={otherText} onChangeText={setOtherText} placeholder="e.g. Shellfish" />
      ) : null}
    </OnboardingScaffold>
  );
}
