import { Text as RNText, type TextProps } from 'react-native';

type Variant = 'display' | 'title' | 'subtitle' | 'body' | 'caption';

// Sized for non-technical users glancing at a phone — err big and bold.
// `display` is for hero numbers (calories, weight), not headings.
// IMPORTANT: use standard scale classes (text-base, text-sm), never
// arbitrary values like text-[16px], for the size — arbitrary-value classes
// don't reliably lose to a larger size class appended via className (no
// tailwind-merge here), which shipped hero numbers rendering at body size.
const VARIANT_CLASSES: Record<Variant, string> = {
  display: 'text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50',
  title: 'text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50',
  subtitle: 'text-xl font-bold text-gray-900 dark:text-gray-50',
  body: 'text-base text-gray-700 dark:text-gray-200',
  caption: 'text-sm font-medium text-gray-500 dark:text-gray-400',
};

export function Text({
  variant = 'body',
  className = '',
  ...props
}: TextProps & { variant?: Variant; className?: string }) {
  return <RNText className={`${VARIANT_CLASSES[variant]} ${className}`} {...props} />;
}
