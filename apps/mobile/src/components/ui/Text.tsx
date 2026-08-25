import { Text as RNText, type TextProps } from 'react-native';

type Variant = 'title' | 'subtitle' | 'body' | 'caption';

const VARIANT_CLASSES: Record<Variant, string> = {
  title: 'text-2xl font-semibold text-gray-900 dark:text-gray-50',
  subtitle: 'text-lg font-medium text-gray-900 dark:text-gray-50',
  body: 'text-base text-gray-700 dark:text-gray-200',
  caption: 'text-sm text-gray-500 dark:text-gray-400',
};

export function Text({
  variant = 'body',
  className = '',
  ...props
}: TextProps & { variant?: Variant; className?: string }) {
  return <RNText className={`${VARIANT_CLASSES[variant]} ${className}`} {...props} />;
}
