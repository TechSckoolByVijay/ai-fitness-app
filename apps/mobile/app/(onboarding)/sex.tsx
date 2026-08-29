import type { Sex } from '@fitness-app/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { nextStepRoute, stepNumber } from '../../src/components/onboarding/steps';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { useUpdateProfile } from '../../src/hooks/useOnboardingMutations';

const OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function SexStep() {
  const [sex, setSex] = useState<Sex | null>(null);
  const updateProfile = useUpdateProfile();

  const handleNext = async () => {
    if (!sex) return;
    await updateProfile.mutateAsync({ sex });
    router.push(nextStepRoute('sex'));
  };

  return (
    <OnboardingScaffold
      step={stepNumber('sex')}
      title="What's your sex?"
      subtitle="Calorie needs differ, so this makes your targets more accurate."
      footer={<Button label="Continue" onPress={handleNext} disabled={!sex} loading={updateProfile.isPending} />}
    >
      <View className="gap-3">
        {OPTIONS.map((opt) => {
          const selected = sex === opt.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setSex(opt.value)}
              className={`rounded-2xl border p-4 ${
                selected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-muted-dark'
              }`}
            >
              <Text
                variant="body"
                className={selected ? 'font-semibold text-primary-700 dark:text-primary-300' : ''}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingScaffold>
  );
}
