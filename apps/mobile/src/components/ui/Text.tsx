import { Text as RNText, type TextProps } from 'react-native';

type Variant = 'display' | 'title' | 'subtitle' | 'body' | 'caption';

// Sized for non-technical users glancing at a phone — err big and bold.
// `display` is for hero numbers (calories, weight), not headings.
const VARIANT_CLASSES: Record<Variant, string> = {
  display: 'text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50',
  title: 'text-[30px] leading-9 font-extrabold tracking-tight text-gray-900 dark:text-gray-50',
  subtitle: 'text-xl font-bold text-gray-900 dark:text-gray-50',
  body: 'text-[16px] leading-6 text-gray-700 dark:text-gray-200',
  caption: 'text-[14px] leading-5 font-medium text-gray-500 dark:text-gray-400',
};

export function Text({
  variant = 'body',
  className = '',
  ...props
}: TextProps & { variant?: Variant; className?: string }) {
  return <RNText className={`${VARIANT_CLASSES[variant]} ${className}`} {...props} />;
}
