import type { ActivityLevel } from '@fitness-app/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { nextStepRoute, stepNumber } from '../../src/components/onboarding/steps';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { useUpdateProfile } from '../../src/hooks/useOnboardingMutations';

const OPTIONS: { value: ActivityLevel; label: string; detail: string }[] = [
  { value: 'sedentary', label: 'Sedentary', detail: 'Little to no exercise' },
  { value: 'light', label: 'Light', detail: 'Exercise 1-3 days a week' },
  { value: 'moderate', label: 'Moderate', detail: 'Exercise 3-5 days a week' },
  { value: 'active', label: 'Active', detail: 'Exercise 6-7 days a week' },
  { value: 'very_active', label: 'Very active', detail: 'Physical job or training twice a day' },
];

export default function ActivityStep() {
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const updateProfile = useUpdateProfile();

  const handleNext = async () => {
    if (!activityLevel) return;
    await updateProfile.mutateAsync({ activityLevel });
    router.push(nextStepRoute('activity'));
  };

  return (
    <OnboardingScaffold
      step={stepNumber('activity')}
      title="How active are you?"
      subtitle="Roughly is fine — this scales your daily calorie target."
      footer={
        <Button label="Continue" onPress={handleNext} disabled={!activityLevel} loading={updateProfile.isPending} />
      }
    >
      <View className="gap-3">
        {OPTIONS.map((opt) => {
          const selected = activityLevel === opt.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setActivityLevel(opt.value)}
              className={`rounded-2xl border p-4 ${
                selected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-muted-dark'
              }`}
            >
              <Text
                variant="body"
                className={selected ? 'font-semibold text-primary-700 dark:text-primary-300' : 'font-semibold'}
              >
                {opt.label}
              </Text>
              <Text variant="caption" className="mt-0.5 text-gray-500 dark:text-gray-400">
                {opt.detail}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingScaffold>
  );
}
