import { View, type ViewProps } from 'react-native';

export function Card({ className = '', ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl bg-white p-4 dark:bg-muted-dark ${className}`}
      {...props}
    />
  );
}
