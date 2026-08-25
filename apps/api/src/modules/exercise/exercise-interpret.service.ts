import { InterpretedActivitySchema, type ExerciseExtractionEvent, type InterpretedActivity } from '@fitness-app/shared';
import { classifyItemConfidence, shouldAutoLog } from '../confidence';
import { calculateCaloriesBurned } from './calorie-burn';

const DEFAULT_AUTO_LOG_SETTING = true;

/**
 * Pure, synchronous — the AI event only supplies WHAT was done; the calorie
 * number always comes from calculateCaloriesBurned's deterministic MET
 * formula, never from the model (explicit user requirement, matching spec
 * principle #6 extended from food to activity).
 */
export function interpretExerciseEvent(
  event: ExerciseExtractionEvent,
  sourceText: string,
  weightKg: number,
): InterpretedActivity {
  const burn = calculateCaloriesBurned({
    activityType: event.activityType,
    durationMinutes: event.durationMinutes,
    steps: event.steps,
    distanceKm: event.distanceKm,
    intensity: event.intensity,
    weightKg,
  });

  const tier = classifyItemConfidence(event.confidence);
  const autoLog = shouldAutoLog(tier, DEFAULT_AUTO_LOG_SETTING);

  const activity: InterpretedActivity = {
    activityType: event.activityType,
    loggedAt: event.timestamp,
    sourceText,
    durationMinutes: burn.durationMinutes,
    steps: event.steps,
    distanceKm: event.distanceKm,
    intensity: event.intensity,
    caloriesBurned: burn.caloriesBurned,
    confidence: event.confidence,
    tier,
    autoLog,
  };

  return InterpretedActivitySchema.parse(activity);
}
