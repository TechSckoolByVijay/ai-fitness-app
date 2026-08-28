import { View, type ViewProps } from 'react-native';

export function Card({ className = '', ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-3xl bg-white p-5 shadow-sm shadow-black/5 dark:bg-muted-dark ${className}`}
      {...props}
    />
  );
}
