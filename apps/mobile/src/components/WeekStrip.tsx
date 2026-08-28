import { View } from 'react-native';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

interface WeekStripProps {
  /** Last 7 days, oldest first, ending today. */
  days: Array<{ date: string; logged: boolean }>;
  streak: number;
  bestInWindow: number;
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The reference-app week row: seven date bubbles, logged days filled green,
 * today ringed dark — plus the 🔥 streak line. This is the "showing up"
 * scoreboard, meant to be the first thing that greets the user every day.
 */
export function WeekStrip({ days, streak, bestInWindow }: WeekStripProps) {
  return (
    <Card>
      <View className="flex-row justify-between">
        {days.map((day, index) => {
          // Parse as UTC date-only to avoid timezone off-by-one on the letter.
          const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
          const dayOfMonth = Number(day.date.slice(8, 10));
          const isToday = index === days.length - 1;
          return (
            <View key={day.date} className="items-center gap-1.5">
              <Text variant="caption" className={isToday ? 'font-bold text-gray-900 dark:text-gray-50' : ''}>
                {DAY_LETTERS[weekday]}
              </Text>
              <View
                className={`h-10 w-10 items-center justify-center rounded-full ${
                  day.logged
                    ? 'bg-primary-500'
                    : isToday
                      ? 'bg-gray-900 dark:bg-gray-50'
                      : 'bg-muted-light dark:bg-muted-dark'
                }`}
              >
                {day.logged ? (
                  <Text className="text-[16px] font-bold text-white">✓</Text>
                ) : (
                  <Text
                    className={`text-[15px] font-bold ${
                      isToday ? 'text-white dark:text-gray-900' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {dayOfMonth}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <Text variant="body" className="font-bold text-gray-900 dark:text-gray-50">
          🔥 {streak} day streak
        </Text>
        <Text variant="caption">Best: {bestInWindow}</Text>
      </View>
    </Card>
  );
}
