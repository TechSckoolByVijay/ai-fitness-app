import { Pressable } from 'react-native';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full border px-4 py-2.5 ${
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-muted-dark'
      }`}
    >
      <Text
        variant="body"
        className={selected ? 'font-medium text-primary-700 dark:text-primary-300' : ''}
      >
        {label}
      </Text>
    </Pressable>
  );
}
