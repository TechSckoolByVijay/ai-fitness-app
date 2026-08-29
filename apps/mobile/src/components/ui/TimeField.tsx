import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Text } from './Text';

interface TimeFieldProps {
  /** "HH:MM" 24-hour, or null when no time is set yet. */
  value: string | null;
  onChange: (value: string) => void;
  /** Shown when value is null. */
  placeholder?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** "HH:MM" -> a Date today at that time, for seeding the picker. */
function toDate(value: string | null): Date {
  const date = new Date();
  const [h, m] = (value ?? '09:00').split(':');
  date.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
  return date;
}

/**
 * Renders a 12-hour label for readability while the stored value stays
 * 24-hour "HH:MM" — the API's format, and unambiguous across locales.
 */
function toDisplay(value: string | null): string | null {
  if (!value) return null;
  const [hStr, mStr] = value.split(':');
  const hour = Number(hStr);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${mStr} ${suffix}`;
}

/**
 * Tap-to-pick time input, replacing the text field that previously asked
 * users to type "21:00" by hand. The OS picker cannot produce an invalid
 * time, which removes a whole class of input error — the server still
 * validates the format, since the endpoint is public.
 */
export function TimeField({ value, onChange, placeholder = 'Set time', disabled, accessibilityLabel }: TimeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    // Android fires a single event and owns its own dismissal; iOS keeps the
    // spinner mounted and streams changes until it is closed explicitly.
    if (Platform.OS === 'android') setIsOpen(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
  };

  const display = toDisplay(value);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Change reminder time'}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        className={`rounded-xl border px-3.5 py-2 ${
          disabled
            ? 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-muted-dark'
            : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-muted-dark'
        }`}
      >
        <Text
          className={`text-base font-semibold ${
            display ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {display ?? placeholder}
        </Text>
      </Pressable>

      {isOpen ? (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          // The spinner is far easier to land on an exact time than the
          // clock dial, and it renders inline on iOS.
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
