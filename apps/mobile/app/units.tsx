import type { UnitSystem } from '@fitness-app/shared';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Card } from '../src/components/ui/Card';
import { Text } from '../src/components/ui/Text';
import { useMe } from '../src/hooks/useMe';
import { useUpdateProfile } from '../src/hooks/useOnboardingMutations';
import { useRequireAuth } from '../src/hooks/useRequireAuth';

const OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'metric', label: 'Metric (kg, cm)' },
  { value: 'imperial', label: 'Imperial (lb, ft/in)' },
];

export default function UnitsScreen() {
  const isAuthenticated = useRequireAuth();
  const me = useMe();
  const updateProfile = useUpdateProfile();

  if (!isAuthenticated || !me.data) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#12c06e" />
      </View>
    );
  }

  const current = me.data.profile.unitSystem;

  return (
    <ScrollView className="flex-1 bg-surface-light dark:bg-surface-dark" contentContainerClassName="gap-3 p-5">
      <Text variant="caption" className="text-gray-500 dark:text-gray-400">
        Measurement system
      </Text>

      <Card className="gap-0 py-1">
        {OPTIONS.map((option, index) => {
          const selected = current === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => !selected && updateProfile.mutate({ unitSystem: option.value })}
              className={`flex-row items-center justify-between py-4 ${
                index > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
              }`}
            >
              <Text variant="body" className={selected ? 'font-semibold' : ''}>
                {option.label}
              </Text>
              <View
                className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                  selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {selected ? <Text className="text-xs font-bold text-white">✓</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </Card>

      <Text variant="caption" className="text-gray-500 dark:text-gray-400">
        This changes how weights and heights are shown and entered. Your logged
        data is unchanged — nothing is converted or rewritten.
      </Text>
    </ScrollView>
  );
}
