import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { PHOTO_STEPS, SLOW_AFTER_MS, TEXT_STEPS, activeStepIndex } from '../utils/analyzingSteps';
import { Card } from './ui/Card';
import { SkeletonBlock } from './ui/SkeletonBlock';
import { Text } from './ui/Text';

interface AnalyzingProgressProps {
  /** What the user said — quoted back so they can see what's being worked on. */
  sourceText?: string;
  isPhoto: boolean;
}

/**
 * Shown while an interpret request is in flight. A single word on an empty
 * screen read as "stuck"; this shows what was sent, the steps being worked
 * through, and the shape of the answer that's coming.
 */
export function AnalyzingProgress({ sourceText, isPhoto }: AnalyzingProgressProps) {
  const steps = isPhoto ? PHOTO_STEPS : TEXT_STEPS;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => clearInterval(timer);
  }, []);

  const active = activeStepIndex(elapsed, steps.length);

  return (
    <View className="gap-4" accessibilityLiveRegion="polite">
      {sourceText ? (
        <View className="rounded-3xl bg-primary-50 px-4 py-3 dark:bg-primary-900/30">
          <Text variant="caption" className="font-bold text-primary-700 dark:text-primary-300">
            You said
          </Text>
          <Text variant="body" className="mt-1 italic" numberOfLines={4}>
            &ldquo;{sourceText}&rdquo;
          </Text>
        </View>
      ) : null}

      <Card className="gap-3">
        {steps.map((label, index) => {
          const done = index < active;
          const current = index === active;
          return (
            <View key={label} className="flex-row items-center gap-3">
              <View className="h-6 w-6 items-center justify-center">
                {done ? (
                  <Text className="text-base text-primary-600 dark:text-primary-400">✓</Text>
                ) : current ? (
                  <ActivityIndicator size="small" color="#12c06e" />
                ) : (
                  <View className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                )}
              </View>
              <Text
                variant="body"
                className={
                  current
                    ? 'font-semibold'
                    : done
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-400 dark:text-gray-500'
                }
              >
                {label}
                {current ? '…' : ''}
              </Text>
            </View>
          );
        })}
        {elapsed >= SLOW_AFTER_MS ? (
          <Text variant="caption" className="pt-1">
            Taking a little longer than usual — hang on, nothing you said is lost.
          </Text>
        ) : null}
      </Card>

      {/* The shape of the answer that's coming, so nothing jumps when it lands. */}
      <Card className="gap-3">
        <SkeletonBlock className="h-4 w-1/3" />
        <SkeletonBlock className="h-5 w-3/4" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-5 w-2/3" />
        <SkeletonBlock className="h-12 w-full" />
      </Card>
    </View>
  );
}
