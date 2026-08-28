import { ScrollView, View } from 'react-native';
import { Text } from '../ui/Text';

const TOTAL_STEPS = 7;

interface OnboardingScaffoldProps {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function OnboardingScaffold({ step, title, subtitle, children, footer }: OnboardingScaffoldProps) {
  return (
    <View className="flex-1 bg-surface-light dark:bg-surface-dark">
      <View className="px-6 pt-6">
        <View className="h-1.5 w-full flex-row gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              className={`h-full flex-1 rounded-full ${
                i < step ? 'bg-primary-500' : 'bg-muted-light dark:bg-muted-dark'
              }`}
            />
          ))}
        </View>
        <Text variant="caption" className="mt-2">
          Step {step} of {TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView contentContainerClassName="flex-1 px-6 pb-6 pt-4" keyboardShouldPersistTaps="handled">
        <Text variant="title" className="mb-1">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" className="mb-6">
            {subtitle}
          </Text>
        ) : null}
        <View className="gap-4">{children}</View>
      </ScrollView>

      <View className="gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">{footer}</View>
    </View>
  );
}
