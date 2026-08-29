import { router } from 'expo-router';
import { useState } from 'react';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { nextStepRoute, stepNumber } from '../../src/components/onboarding/steps';
import { Button } from '../../src/components/ui/Button';
import { HeightField } from '../../src/components/ui/HeightField';
import { useUpdateProfile } from '../../src/hooks/useOnboardingMutations';
import { useUnitSystem } from '../../src/hooks/useUnitSystem';

export default function HeightStep() {
  const [heightCm, setHeightCm] = useState('');
  const updateProfile = useUpdateProfile();
  const unitSystem = useUnitSystem();

  const isValid = Number(heightCm) > 0;

  const handleNext = async () => {
    if (!isValid) return;
    await updateProfile.mutateAsync({ heightCm: Number(heightCm) });
    router.push(nextStepRoute('height'));
  };

  return (
    <OnboardingScaffold
      step={stepNumber('height')}
      title="How tall are you?"
      footer={<Button label="Continue" onPress={handleNext} disabled={!isValid} loading={updateProfile.isPending} />}
    >
      <HeightField valueCm={heightCm} onChangeCm={setHeightCm} unitSystem={unitSystem} />
    </OnboardingScaffold>
  );
}
