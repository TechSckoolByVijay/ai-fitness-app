import type { DietType } from '@fitness-app/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { TextField } from '../../src/components/ui/TextField';
import { useUpdateDiet } from '../../src/hooks/useOnboardingMutations';

const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'non_vegetarian', label: 'Non-vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'other', label: 'Other' },
];

export default function DietStep() {
  const [dietType, setDietType] = useState<DietType | null>(null);
  const [otherText, setOtherText] = useState('');
  const updateDiet = useUpdateDiet();

  const handleNext = async () => {
    if (!dietType) return;
    await updateDiet.mutateAsync({ dietType, otherText: dietType === 'other' ? otherText : undefined });
    router.push('/allergies');
  };

  return (
    <OnboardingScaffold
      step={4}
      title="What do you usually eat?"
      subtitle="This helps us suggest culturally appropriate meals."
      footer={<Button label="Continue" onPress={handleNext} disabled={!dietType} loading={updateDiet.isPending} />}
    >
      <View className="flex-row flex-wrap gap-2">
        {DIET_OPTIONS.map((opt) => (
          <Chip key={opt.value} label={opt.label} selected={dietType === opt.value} onPress={() => setDietType(opt.value)} />
        ))}
      </View>

      {dietType === 'other' ? (
        <TextField label="Tell us more" value={otherText} onChangeText={setOtherText} placeholder="e.g. Pescatarian" />
      ) : null}
    </OnboardingScaffold>
  );
}
