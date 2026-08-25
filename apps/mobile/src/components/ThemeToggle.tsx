import { View } from 'react-native';
import { useThemeStore, type ThemePreference } from '../state/themeStore';
import { Card } from './ui/Card';
import { Chip } from './ui/Chip';
import { Text } from './ui/Text';

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: '☀️ Light' },
  { value: 'dark', label: '🌙 Dark' },
  { value: 'system', label: '⚙️ System' },
];

export function ThemeToggle() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <Card>
      <Text variant="subtitle" className="mb-2">
        Appearance
      </Text>
      <Text variant="caption" className="mb-3">
        Choose how Fitness Coach looks on this device.
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={preference === option.value}
            onPress={() => void setPreference(option.value)}
          />
        ))}
      </View>
    </Card>
  );
}
