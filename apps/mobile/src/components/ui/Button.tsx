import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'cta' | 'secondary' | 'ghost' | 'quiet';

// `cta` exists because the theme is green: on screens already full of green
// surfaces, the single most important action gets orange so it can never
// visually sink into the theme. Use it for exactly one button per screen.
// `quiet` is for de-emphasized actions (Cancel, Start over) that shouldn't
// add another green element to the page.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary-500 active:bg-primary-600',
  cta: 'bg-orange-500 active:bg-orange-600',
  secondary: 'bg-muted-light dark:bg-muted-dark active:opacity-80',
  ghost: 'bg-transparent active:opacity-60',
  quiet: 'bg-transparent active:opacity-60',
};

const TEXT_CLASSES: Record<Variant, string> = {
  primary: 'text-white',
  cta: 'text-white',
  secondary: 'text-gray-900 dark:text-gray-50',
  ghost: 'text-primary-600 dark:text-primary-400',
  quiet: 'text-gray-500 dark:text-gray-400',
};

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
}

// Full pill shape + big bold label — buttons should read as the obvious
// thing to tap, reference-app style, not quiet rectangles.
export function Button({ label, variant = 'primary', loading, disabled, className = '', ...props }: ButtonProps & { className?: string }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      className={`min-h-[56px] items-center justify-center rounded-full px-6 ${VARIANT_CLASSES[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'cta' ? '#ffffff' : '#12c06e'} />
      ) : (
        <Text className={`text-[17px] font-bold ${TEXT_CLASSES[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
