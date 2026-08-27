import { sumNutrition, type InterpretedActivity, type InterpretedHealthEvent, type InterpretedMeal } from '@fitness-app/shared';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { ActivityInterpretationCard } from '../src/components/ActivityInterpretationCard';
import { InterpretationCard } from '../src/components/InterpretationCard';
import { Button } from '../src/components/ui/Button';
import { Chip } from '../src/components/ui/Chip';
import { Text } from '../src/components/ui/Text';
import { TextField } from '../src/components/ui/TextField';
import { useCreateFoodEntry } from '../src/hooks/useFoodEntries';
import { useInterpretEvent } from '../src/hooks/useEvents';
import { useCreateExerciseEntry } from '../src/hooks/useExerciseEntries';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { useVoiceRecognition } from '../src/hooks/useVoiceRecognition';
import { usePendingPhotoStore } from '../src/state/pendingPhoto';
import { useVoiceMachine } from '../src/state/voiceMachine';
import { goBackOrHome } from '../src/utils/navigation';
import { scaleNutritionToCalories } from '../src/utils/nutritionOverride';

const EXAMPLE_PHRASES = [
  'I ate a banana.',
  'Breakfast was milk and a banana, lunch was 3 chapatis and rice.',
  'I played badminton for 30 minutes.',
  'I walked 1000 steps.',
];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function eventLabel(event: InterpretedHealthEvent): string {
  if (event.type === 'food') return event.meal.mealType;
  return event.activity.activityType.replace(/_/g, ' ');
}

function eventEmoji(event: InterpretedHealthEvent): string {
  if (event.type === 'exercise') return '🏃';
  switch (event.meal.mealType) {
    case 'breakfast':
      return '🍳';
    case 'lunch':
      return '🥗';
    case 'dinner':
      return '🍽️';
    default:
      return '🍎';
  }
}

export default function LogMealScreen() {
  const isAuthenticated = useRequireAuth();
  const [state, dispatch] = useVoiceMachine();
  const [text, setText] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const interpretEvent = useInterpretEvent();
  const createEntry = useCreateFoodEntry();
  const createActivity = useCreateExerciseEntry();
  const isSubmitting = createEntry.isPending || createActivity.isPending;

  const persistMeal = async (meal: InterpretedMeal) => {
    await createEntry.mutateAsync({
      mealType: meal.mealType,
      loggedAt: meal.loggedAt,
      sourceText: meal.sourceText,
      confidenceTier: meal.tier,
      items: meal.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedWeightGrams: item.estimatedWeightGrams,
        preparationMethod: item.preparationMethod,
        ingredients: item.ingredients,
        descriptors: item.descriptors,
        confidence: item.confidence,
        nutrition: item.nutrition,
      })),
    });
  };

  const persistActivity = async (activity: InterpretedActivity) => {
    await createActivity.mutateAsync({
      activityType: activity.activityType,
      loggedAt: activity.loggedAt,
      sourceText: activity.sourceText,
      durationMinutes: activity.durationMinutes,
      steps: activity.steps,
      distanceKm: activity.distanceKm,
      intensity: activity.intensity,
      caloriesBurned: activity.caloriesBurned,
      confidence: activity.confidence,
    });
  };

  const persistEvent = async (event: InterpretedHealthEvent) => {
    if (event.type === 'food') await persistMeal(event.meal);
    else await persistActivity(event.activity);
  };

  const runInterpretCore = async (input: { text: string } | { imageBase64: string }, sourceTextForFailure: string) => {
    dispatch({ type: 'SUBMIT' });
    try {
      const result = await interpretEvent.mutateAsync({ ...input, nowISO: new Date().toISOString() });
      const sourceText = 'imageBase64' in input ? '[Photo]' : sourceTextForFailure;
      dispatch({ type: 'INTERPRETED', events: result.events, sourceText });

      // Auto-log stays off globally (see food.service.ts) but the pipeline
      // still supports it — honor it here if ever re-enabled per-event.
      const autoEvents = result.events.filter(
        (e) => (e.type === 'food' && e.meal.autoLog) || (e.type === 'exercise' && e.activity.autoLog),
      );
      if (autoEvents.length === result.events.length && autoEvents.length > 0) {
        await Promise.all(autoEvents.map(persistEvent));
        setText('');
        goBackOrHome();
      }
    } catch (error) {
      dispatch({
        type: 'FAILED',
        message: error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
        retryText: 'imageBase64' in input ? undefined : sourceTextForFailure,
      });
    }
  };

  const runInterpret = async (inputText: string) => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    await runInterpretCore({ text: trimmed }, trimmed);
  };

  const runInterpretPhoto = async (imageBase64: string) => {
    await runInterpretCore({ imageBase64 }, '');
  };

  const voice = useVoiceRecognition((finalText) => {
    if (finalText.trim()) {
      setText(finalText);
      void runInterpret(finalText);
    }
  });

  /** Confirms one event from a (possibly multi-event) batch, dropping it from the list — or leaving the screen once none remain. */
  const confirmEventAt = async (index: number) => {
    if (state.status !== 'interpretation') return;
    const event = state.events[index];
    if (!event) return;

    await persistEvent(event);
    setText('');

    if (state.events.length === 1) {
      goBackOrHome();
    } else {
      dispatch({ type: 'REMOVE_EVENT', index });
    }
  };

  const confirmAllEvents = async () => {
    if (state.status !== 'interpretation') return;
    await Promise.all(state.events.map(persistEvent));
    setText('');
    goBackOrHome();
  };

  /** Drops one event without saving it — in photo mode with nothing left, there's no idle screen to fall back to, so leave instead. */
  const removeEventAt = (index: number) => {
    if (state.status === 'interpretation' && state.events.length === 1 && photoBase64) {
      goBackOrHome();
      return;
    }
    dispatch({ type: 'REMOVE_EVENT', index });
  };

  /** A quick-option answer to a clarifying question re-interprets just that one item and merges it back into its own slot — never replaces the rest of a multi-event batch. */
  const runQuickOptionAt = async (index: number, option: string) => {
    try {
      const result = await interpretEvent.mutateAsync({ text: option, nowISO: new Date().toISOString() });
      const replacement = result.events[0];
      if (replacement?.type === 'food') {
        dispatch({ type: 'UPDATE_MEAL', index, meal: replacement.meal });
      }
    } catch {
      // A quick-option refinement failing isn't worth a full error screen — the card just keeps its current (still-editable) state.
    }
  };

  const adjustQuantity = (eventIndex: number, itemIndex: number, delta: number) => {
    if (state.status !== 'interpretation') return;
    const event = state.events[eventIndex];
    if (event?.type !== 'food') return;
    const meal = event.meal;
    const items = [...meal.items];
    const item = items[itemIndex];
    const step = item.unit === 'g' || item.unit === 'ml' ? delta * 10 : delta;
    const minQty = item.unit === 'g' || item.unit === 'ml' ? 10 : 1;
    const newQuantity = Math.max(minQty, item.quantity + step);
    const scale = newQuantity / item.quantity;

    items[itemIndex] = {
      ...item,
      quantity: newQuantity,
      nutrition: {
        ...item.nutrition,
        calories: round1(item.nutrition.calories * scale),
        proteinG: round1(item.nutrition.proteinG * scale),
        carbsG: round1(item.nutrition.carbsG * scale),
        fatG: round1(item.nutrition.fatG * scale),
        fiberG: round1((item.nutrition.fiberG ?? 0) * scale),
        sugarG: item.nutrition.sugarG !== undefined ? round1(item.nutrition.sugarG * scale) : undefined,
        sodiumMg: item.nutrition.sodiumMg !== undefined ? round1(item.nutrition.sodiumMg * scale) : undefined,
      },
    };

    dispatch({
      type: 'UPDATE_MEAL',
      index: eventIndex,
      meal: { ...meal, items, estimatedTotals: sumNutrition(items.map((i) => i.nutrition)) },
    });
  };

  const adjustCalories = (eventIndex: number, itemIndex: number, calories: number) => {
    if (state.status !== 'interpretation') return;
    const event = state.events[eventIndex];
    if (event?.type !== 'food') return;
    const meal = event.meal;
    const items = [...meal.items];
    items[itemIndex] = { ...items[itemIndex], nutrition: scaleNutritionToCalories(items[itemIndex].nutrition, calories) };

    dispatch({
      type: 'UPDATE_MEAL',
      index: eventIndex,
      meal: { ...meal, items, estimatedTotals: sumNutrition(items.map((i) => i.nutrition)) },
    });
  };

  const removeItem = (eventIndex: number, itemIndex: number) => {
    if (state.status !== 'interpretation') return;
    const event = state.events[eventIndex];
    if (event?.type !== 'food') return;
    const meal = event.meal;
    const items = meal.items.filter((_, i) => i !== itemIndex);
    if (items.length === 0) return;
    dispatch({
      type: 'UPDATE_MEAL',
      index: eventIndex,
      meal: { ...meal, items, estimatedTotals: sumNutrition(items.map((i) => i.nutrition)) },
    });
  };

  const startRecording = async () => {
    dispatch({ type: 'START_RECORDING' });
    await voice.start();
  };

  const cancelRecording = () => {
    voice.stop();
    dispatch({ type: 'CANCEL' });
  };

  // The mic button that opens this screen already IS the "I want to speak"
  // gesture — requiring a second tap here once the screen loads was
  // reported as bad UX. Auto-start listening immediately instead; typing is
  // still available on the recording screen below for anyone who prefers it.
  // A photo picked from the Home screen's camera button takes priority over
  // auto-starting voice — it's handed off via a store (too large for a
  // navigation param), consumed once here, and kept in local state after so
  // "Try again" on failure can retry without re-picking.
  const hasAutoStartedRef = useRef(false);
  const consumePendingPhoto = usePendingPhotoStore((s) => s.imageBase64);
  const clearPendingPhoto = usePendingPhotoStore((s) => s.clearPendingPhoto);
  useEffect(() => {
    if (!isAuthenticated || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;

    if (consumePendingPhoto) {
      const image = consumePendingPhoto;
      clearPendingPhoto();
      setPhotoBase64(image);
      void runInterpretPhoto(image);
    } else {
      void startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#22b56d" />
      </View>
    );
  }

  const events = state.status === 'interpretation' ? state.events : [];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-surface-dark"
    >
      <ScrollView contentContainerClassName="gap-4 p-5" keyboardShouldPersistTaps="handled">
        {state.status === 'idle' ? (
          <View className="items-center gap-4 py-10">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start recording"
              onPress={startRecording}
              className="h-24 w-24 items-center justify-center rounded-full bg-primary-500 shadow-lg active:bg-primary-600"
            >
              <Text className="text-5xl">🎙️</Text>
            </Pressable>
            <Text variant="subtitle">Tell me what you ate or did</Text>
            <Text variant="caption" className="text-center">
              Tap to speak, or type it below. You can log a whole day at once — "breakfast was
              X, lunch was Y".
            </Text>
            <TextField
              label="What did you eat or do?"
              value={text}
              onChangeText={setText}
              placeholder="e.g. Breakfast was milk and a banana, lunch was 3 chapatis and rice"
              multiline
              className="w-full"
            />
            <Button label="Log it" onPress={() => runInterpret(text)} disabled={!text.trim()} className="w-full" />
          </View>
        ) : null}

        {state.status === 'recording' ? (
          <View className="items-center gap-4 py-8">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop recording"
              onPress={() => voice.stop()}
              className="h-24 w-24 items-center justify-center rounded-full bg-primary-500 shadow-lg active:bg-primary-600"
            >
              <Text className="text-5xl">{voice.isListening ? '🔴' : '🎙️'}</Text>
            </Pressable>
            <Text variant="subtitle">{voice.isListening ? 'Listening...' : 'Starting...'}</Text>

            {voice.transcript ? (
              <Text variant="body" className="text-center italic">
                &quot;{voice.transcript}&quot;
              </Text>
            ) : null}

            {voice.error ? (
              <Text variant="caption" className="text-center text-red-500">
                {voice.error}
              </Text>
            ) : null}

            <Button label="Stop" onPress={() => voice.stop()} className="w-full" />
            <Button label="Cancel" variant="ghost" onPress={cancelRecording} />

            <View className="mt-2 w-full gap-2">
              <Text variant="caption">Or type it instead — a whole day at once works too:</Text>
              <TextField
                label="What did you eat or do?"
                value={text}
                onChangeText={setText}
                placeholder="e.g. Breakfast was milk and a banana, lunch was 3 chapatis and rice"
                multiline
                className="w-full"
              />
              <Button label="Log it" onPress={() => runInterpret(text)} disabled={!text.trim()} className="w-full" />
              <View className="flex-row flex-wrap gap-2">
                {EXAMPLE_PHRASES.map((phrase) => (
                  <Chip key={phrase} label={phrase} selected={text === phrase} onPress={() => setText(phrase)} />
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {state.status === 'processing' ? (
          <View className="items-center gap-3 py-10">
            <Text className="text-3xl">{photoBase64 ? '📷' : '🎙️'}</Text>
            <Text variant="body">{photoBase64 ? 'Looking at your photo...' : 'Understanding...'}</Text>
          </View>
        ) : null}

        {events.length > 1 ? (
          <View className="flex-row items-center justify-between rounded-xl bg-primary-50 px-4 py-3 dark:bg-primary-950">
            <Text variant="caption">Found {events.length} things to log — review each, or confirm them all.</Text>
            <Button label="Confirm all" onPress={confirmAllEvents} loading={isSubmitting} />
          </View>
        ) : null}

        {events.map((event, index) => (
          <View key={index} className="gap-1.5">
            {events.length > 1 ? (
              <View className="flex-row items-center justify-between px-1">
                <Text variant="caption" className="font-medium capitalize">
                  {eventEmoji(event)} {eventLabel(event)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove this entry"
                  onPress={() => removeEventAt(index)}
                  className="h-7 w-7 items-center justify-center rounded-full"
                >
                  <Text variant="body" className="text-red-500">
                    ×
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {event.type === 'food' ? (
              <InterpretationCard
                meal={event.meal}
                isSubmitting={isSubmitting}
                onConfirm={() => confirmEventAt(index)}
                onAdjustQuantity={(itemIndex, delta) => adjustQuantity(index, itemIndex, delta)}
                onAdjustCalories={(itemIndex, calories) => adjustCalories(index, itemIndex, calories)}
                onRemoveItem={(itemIndex) => removeItem(index, itemIndex)}
                onQuickOption={(option) => runQuickOptionAt(index, option)}
                onRetype={() => removeEventAt(index)}
              />
            ) : (
              <ActivityInterpretationCard
                activity={event.activity}
                isSubmitting={isSubmitting}
                onConfirm={() => confirmEventAt(index)}
                onRetype={() => removeEventAt(index)}
              />
            )}
          </View>
        ))}

        {state.status === 'error' ? (
          <View className="gap-3">
            <Text variant="body" className="text-red-500">
              {state.message}
            </Text>
            {photoBase64 ? (
              <>
                <Button label="Try again" onPress={() => runInterpretPhoto(photoBase64)} />
                <Button label="Cancel" variant="ghost" onPress={goBackOrHome} />
              </>
            ) : (
              <>
                <Button label="Try again" onPress={() => runInterpret(state.retryText ?? text)} />
                <Button label="Edit text" variant="ghost" onPress={() => dispatch({ type: 'RESET' })} />
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
