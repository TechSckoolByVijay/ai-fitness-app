import type { GoalType } from '@fitness-app/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { Text } from '../src/components/ui/Text';
import { useMe } from '../src/hooks/useMe';
import { useUpdateGoals } from '../src/hooks/useOnboardingMutations';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { goBackOrHome } from '../src/utils/navigation';

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

export default function EditGoalsScreen() {
  const isAuthenticated = useRequireAuth();
  const me = useMe();
  const updateGoals = useUpdateGoals();

  const [primaryGoal, setPrimaryGoal] = useState<GoalType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!me.data || hydrated) return;
    setPrimaryGoal(me.data.goals.find((g) => g.isPrimary)?.type ?? null);
    setHydrated(true);
  }, [me.data, hydrated]);

  const submit = async () => {
    if (!primaryGoal) return;
    setError(null);
    try {
      await updateGoals.mutateAsync({ primaryGoal });
      goBackOrHome();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (!isAuthenticated || me.isLoading || !hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#22b56d" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-surface-dark"
    >
      <ScrollView contentContainerClassName="gap-4 p-5">
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

        {error ? (
          <Text variant="caption" className="text-red-500">
            {error}
          </Text>
        ) : null}

        <Button label="Save" onPress={submit} disabled={!primaryGoal} loading={updateGoals.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
