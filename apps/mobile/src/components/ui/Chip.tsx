import { Pressable } from 'react-native';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

// Tinted pills that clearly look tappable (suggestion chips are a primary
// interaction for non-technical users, not decoration).
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full px-4 py-3 ${
        selected
          ? 'bg-primary-500'
          : 'bg-primary-50 active:bg-primary-100 dark:bg-primary-900/40 dark:active:bg-primary-900/60'
      }`}
    >
      <Text
        variant="body"
        className={
          selected ? 'font-bold text-white' : 'font-semibold text-primary-700 dark:text-primary-300'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
