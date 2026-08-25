import { TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, className = '', ...props }: TextFieldProps & { className?: string }) {
  return (
    <View className="gap-1.5">
      <Text variant="caption">{label}</Text>
      <TextInput
        className={`min-h-[52px] rounded-xl border border-gray-200 bg-white px-4 text-base text-gray-900 dark:border-gray-700 dark:bg-muted-dark dark:text-gray-50 ${className}`}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error ? (
        <Text variant="caption" className="text-red-500">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
