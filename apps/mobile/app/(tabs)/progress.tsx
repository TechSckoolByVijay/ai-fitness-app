import { View } from 'react-native';
import { EmptyState } from '../../src/components/ui/EmptyState';

export default function ProgressScreen() {
  return (
    <View className="flex-1 justify-center bg-white dark:bg-surface-dark">
      <EmptyState title="Your progress story starts today." />
    </View>
  );
}
