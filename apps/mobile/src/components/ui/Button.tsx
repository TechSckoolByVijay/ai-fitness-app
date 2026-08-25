import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary-500 active:bg-primary-600',
  secondary: 'bg-muted-light dark:bg-muted-dark active:opacity-80',
  ghost: 'bg-transparent active:opacity-60',
};

const TEXT_CLASSES: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-gray-900 dark:text-gray-50',
  ghost: 'text-primary-600 dark:text-primary-400',
};

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, variant = 'primary', loading, disabled, className = '', ...props }: ButtonProps & { className?: string }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      className={`min-h-[52px] items-center justify-center rounded-xl px-6 ${VARIANT_CLASSES[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#22b56d'} />
      ) : (
        <Text className={`text-base font-semibold ${TEXT_CLASSES[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
