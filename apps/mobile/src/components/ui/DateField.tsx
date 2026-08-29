import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Text } from './Text';

interface DateFieldProps {
  /** ISO "YYYY-MM-DD", or empty when nothing is chosen yet. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Defaults to a sensible birth year rather than today, which is never a date of birth. */
  initialDate?: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  accessibilityLabel?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Formats in the device's locale for display; the stored value stays ISO. */
function toDisplay(iso: string): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Tap-to-pick date, replacing a text field that asked people to type
 * "YYYY-MM-DD" by hand and rejected them with a regex when they did not.
 */
export function DateField({
  value,
  onChange,
  placeholder = 'Select a date',
  initialDate,
  minimumDate,
  maximumDate,
  accessibilityLabel,
}: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  const parsed = (() => {
    if (!value) return initialDate ?? new Date(1995, 0, 1);
    const [y, m, d] = value.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : (initialDate ?? new Date(1995, 0, 1));
  })();

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    // Android fires once and dismisses itself; iOS streams changes until closed.
    if (Platform.OS === 'android') setIsOpen(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
  };

  const display = toDisplay(value);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Choose a date'}
        onPress={() => setIsOpen(true)}
        className="rounded-xl border border-gray-300 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-muted-dark"
      >
        <Text
          className={`text-lg font-semibold ${
            display ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {display ?? placeholder}
        </Text>
      </Pressable>

      {isOpen ? (
        <DateTimePicker
          value={parsed}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      ) : null}

      {isOpen && Platform.OS === 'ios' ? (
        <Pressable accessibilityRole="button" onPress={() => setIsOpen(false)} className="self-end px-2 py-1">
          <Text className="text-base font-semibold text-primary-600 dark:text-primary-400">Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
