import type { GoalType } from '@fitness-app/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { nextStepRoute, stepNumber } from '../../src/components/onboarding/steps';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { useUpdateGoals } from '../../src/hooks/useOnboardingMutations';

/**
 * Three goals, not seven. The four that were dropped (improve fitness /
 * health / sleep, healthier eating) carry no calorie adjustment and made
 * the first real decision in onboarding feel like a survey. They remain in
 * the GoalType enum -- pruning it would mean a migration and touching the
 * BMR/TDEE branches for no benefit.
 *
 * gain_muscle is the surplus goal, so it backs "Gain weight" -- the label
 * says what the user gets and the detail line says how.
 */
const GOAL_OPTIONS: { value: GoalType; label: string; detail: string; emoji: string }[] = [
  { value: 'lose_weight', label: 'Lose weight', detail: 'A moderate daily calorie deficit', emoji: '📉' },
  { value: 'maintain_weight', label: 'Maintain weight', detail: 'Stay around where you are', emoji: '⚖️' },
  { value: 'gain_muscle', label: 'Gain weight', detail: 'A calorie surplus to build muscle', emoji: '💪' },
];

function GoalCard({
  emoji,
  label,
  detail,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-xl border p-4 ${
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-muted-dark'
      }`}
    >
      <Text className="text-2xl">{emoji}</Text>
      <View className="flex-1">
        <Text
          variant="body"
          className={selected ? 'font-semibold text-primary-700 dark:text-primary-300' : 'font-semibold'}
        >
          {label}
        </Text>
        <Text variant="caption" className="mt-0.5 text-gray-500 dark:text-gray-400">
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

export default function GoalStep() {
  const [primaryGoal, setPrimaryGoal] = useState<GoalType | null>(null);
  const updateGoals = useUpdateGoals();

  const handleNext = async () => {
    if (!primaryGoal) return;
    await updateGoals.mutateAsync({ primaryGoal });
    router.push(nextStepRoute('goal'));
  };

  return (
    <OnboardingScaffold
      step={stepNumber('goal')}
      title="What's your primary goal?"
      subtitle="We'll tailor your recommendations around this."
      footer={<Button label="Continue" onPress={handleNext} disabled={!primaryGoal} loading={updateGoals.isPending} />}
    >
      <View className="gap-3">
        {GOAL_OPTIONS.map((opt) => (
          <GoalCard
            key={opt.value}
            emoji={opt.emoji}
            label={opt.label}
            detail={opt.detail}
            selected={primaryGoal === opt.value}
            onPress={() => setPrimaryGoal(opt.value)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
