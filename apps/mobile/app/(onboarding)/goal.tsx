import type { GoalType } from '@fitness-app/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { useUpdateGoals } from '../../src/hooks/useOnboardingMutations';

const GOAL_OPTIONS: { value: GoalType; label: string; emoji: string }[] = [
  { value: 'lose_weight', label: 'Lose weight', emoji: '⚖️' },
  { value: 'gain_muscle', label: 'Gain muscle', emoji: '💪' },
  { value: 'maintain_weight', label: 'Maintain weight', emoji: '🎯' },
  { value: 'improve_fitness', label: 'Improve fitness', emoji: '🏃' },
  { value: 'improve_health', label: 'Improve overall health', emoji: '❤️' },
  { value: 'improve_sleep', label: 'Improve sleep', emoji: '🌙' },
  { value: 'healthier_eating', label: 'Build healthier eating habits', emoji: '🥗' },
];

function GoalCard({
  emoji,
  label,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
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
      <Text variant="body" className={selected ? 'flex-1 font-medium text-primary-700 dark:text-primary-300' : 'flex-1'}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function GoalStep() {
  const [primaryGoal, setPrimaryGoal] = useState<GoalType | null>(null);
  const updateGoals = useUpdateGoals();

  const handleNext = async () => {
    if (!primaryGoal) return;
    await updateGoals.mutateAsync({ primaryGoal });
    router.push('/diet');
  };

  return (
    <OnboardingScaffold
      step={3}
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
            selected={primaryGoal === opt.value}
            onPress={() => setPrimaryGoal(opt.value)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}
