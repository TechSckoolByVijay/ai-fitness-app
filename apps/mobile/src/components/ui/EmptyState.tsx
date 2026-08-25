import { View } from 'react-native';
import { Text } from './Text';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ emoji, title, subtitle, action }: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-3 px-6 py-10">
      {emoji ? <Text className="text-4xl">{emoji}</Text> : null}
      <Text variant="subtitle" className="text-center">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" className="text-center">
          {subtitle}
        </Text>
      ) : null}
      {action}
    </View>
  );
}
