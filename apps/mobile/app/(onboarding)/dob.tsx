import { router } from 'expo-router';
import { useState } from 'react';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { nextStepRoute, stepNumber } from '../../src/components/onboarding/steps';
import { Button } from '../../src/components/ui/Button';
import { DateField } from '../../src/components/ui/DateField';
import { useUpdateProfile } from '../../src/hooks/useOnboardingMutations';

/** Old enough that the BMR formula is meaningful, young enough to be a real person. */
const OLDEST = new Date(new Date().getFullYear() - 100, 0, 1);
const YOUNGEST = new Date(new Date().getFullYear() - 13, 0, 1);

export default function DateOfBirthStep() {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const updateProfile = useUpdateProfile();

  const handleNext = async () => {
    if (!dateOfBirth) return;
    await updateProfile.mutateAsync({ dateOfBirth });
    router.push(nextStepRoute('dob'));
  };

  return (
    <OnboardingScaffold
      step={stepNumber('dob')}
      title="When were you born?"
      subtitle="The same intake that suits a 30-year-old often doesn't suit an 80-year-old."
      footer={
        <Button label="Continue" onPress={handleNext} disabled={!dateOfBirth} loading={updateProfile.isPending} />
      }
    >
      <DateField
        value={dateOfBirth}
        onChange={setDateOfBirth}
        placeholder="Select your date of birth"
        minimumDate={OLDEST}
        maximumDate={YOUNGEST}
        accessibilityLabel="Choose your date of birth"
      />
    </OnboardingScaffold>
  );
}
