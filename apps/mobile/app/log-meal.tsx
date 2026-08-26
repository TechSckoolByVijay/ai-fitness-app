import { sumNutrition, type InterpretedActivity, type InterpretedMeal } from '@fitness-app/shared';
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
import { useVoiceMachine } from '../src/state/voiceMachine';
import { goBackOrHome } from '../src/utils/navigation';
import { scaleNutritionToCalories } from '../src/utils/nutritionOverride';

const EXAMPLE_PHRASES = [
  'I ate a banana.',
  'I had two chapatis and dal.',
  'I played badminton for 30 minutes.',
  'I walked 1000 steps.',
];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export default function LogMealScreen() {
  const isAuthenticated = useRequireAuth();
  const [state, dispatch] = useVoiceMachine();
  const [text, setText] = useState('');
  const interpretEvent = useInterpretEvent();
  const createEntry = useCreateFoodEntry();
  const createActivity = useCreateExerciseEntry();
  const isSubmitting = createEntry.isPending || createActivity.isPending;

  const runInterpret = async (inputText: string) => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    dispatch({ type: 'SUBMIT' });
    try {
      const result = await interpretEvent.mutateAsync({ text: trimmed, nowISO: new Date().toISOString() });
      dispatch({ type: 'INTERPRETED', event: result.event, sourceText: trimmed });

      if (result.event.type === 'food' && result.event.meal.autoLog) {
        await persistMeal(result.event.meal);
      } else if (result.event.type === 'exercise' && result.event.activity.autoLog) {
        await persistActivity(result.event.activity);
      }
    } catch (error) {
      dispatch({
        type: 'FAILED',
        message: error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
        retryText: trimmed,
      });
    }
  };

  const voice = useVoiceRecognition((finalText) => {
    if (finalText.trim()) {
      setText(finalText);
      void runInterpret(finalText);
    }
  });

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
    setText('');
    goBackOrHome();
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
    setText('');
    goBackOrHome();
  };

  const adjustQuantity = (index: number, delta: number) => {
    if (state.status !== 'interpretation' || state.event.type !== 'food') return;
    const meal = state.event.meal;
    const items = [...meal.items];
    const item = items[index];
    const step = item.unit === 'g' || item.unit === 'ml' ? delta * 10 : delta;
    const minQty = item.unit === 'g' || item.unit === 'ml' ? 10 : 1;
    const newQuantity = Math.max(minQty, item.quantity + step);
    const scale = newQuantity / item.quantity;

    items[index] = {
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
      meal: { ...meal, items, estimatedTotals: sumNutrition(items.map((i) => i.nutrition)) },
    });
  };

  const adjustCalories = (index: number, calories: number) => {
    if (state.status !== 'interpretation' || state.event.type !== 'food') return;
    const meal = state.event.meal;
    const items = [...meal.items];
    items[index] = { ...items[index], nutrition: scaleNutritionToCalories(items[index].nutrition, calories) };

    dispatch({
      type: 'UPDATE_MEAL',
      meal: { ...meal, items, estimatedTotals: sumNutrition(items.map((i) => i.nutrition)) },
    });
  };

  const removeItem = (index: number) => {
    if (state.status !== 'interpretation' || state.event.type !== 'food') return;
    const meal = state.event.meal;
    const items = meal.items.filter((_, i) => i !== index);
    if (items.length === 0) return;
    dispatch({
      type: 'UPDATE_MEAL',
      meal: { ...meal, items, estimatedTotals: sumNutrition(items.map((i) => i.nutrition)) },
    });
  };

  const retype = () => {
    voice.stop();
    dispatch({ type: 'RESET' });
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
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
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

  const foodEvent = state.status === 'interpretation' && state.event.type === 'food' ? state.event : null;
  const exerciseEvent = state.status === 'interpretation' && state.event.type === 'exercise' ? state.event : null;

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
              Tap to speak, or type it below.
            </Text>
            <TextField
              label="What did you eat or do?"
              value={text}
              onChangeText={setText}
              placeholder="e.g. I had two chapatis and dal, or I walked 1000 steps"
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
              <Text variant="caption">Or type it instead:</Text>
              <TextField
                label="What did you eat or do?"
                value={text}
                onChangeText={setText}
                placeholder="e.g. I had two chapatis and dal, or I walked 1000 steps"
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
            <Text className="text-3xl">🎙️</Text>
            <Text variant="body">Understanding...</Text>
          </View>
        ) : null}

        {foodEvent ? (
          <InterpretationCard
            meal={foodEvent.meal}
            isSubmitting={isSubmitting}
            onConfirm={() => persistMeal(foodEvent.meal)}
            onAdjustQuantity={adjustQuantity}
            onAdjustCalories={adjustCalories}
            onRemoveItem={removeItem}
            onQuickOption={(option) => runInterpret(option)}
            onRetype={retype}
          />
        ) : null}

        {exerciseEvent ? (
          <ActivityInterpretationCard
            activity={exerciseEvent.activity}
            isSubmitting={isSubmitting}
            onConfirm={() => persistActivity(exerciseEvent.activity)}
            onRetype={retype}
          />
        ) : null}

        {state.status === 'error' ? (
          <View className="gap-3">
            <Text variant="body" className="text-red-500">
              {state.message}
            </Text>
            <Button label="Try again" onPress={() => runInterpret(state.retryText ?? text)} />
            <Button label="Edit text" variant="ghost" onPress={retype} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
