import { HealthExtractionResultSchema, type EventInterpretRequest, type InterpretedHealthEvent } from '@fitness-app/shared';
import { InterpretationFailedError } from '../../lib/errors';
import type { AIProvider } from '../../providers/ai/ai-provider.interface';
import type { NutritionService } from '../../providers/nutrition/nutrition-service.interface';
import type { SpeechProvider } from '../../providers/speech/speech-provider.interface';
import { interpretExerciseEvent } from '../exercise/exercise-interpret.service';
import { interpretFoodEvent } from '../food/food.service';

export interface EventPipelineDeps {
  aiProvider: AIProvider;
  speechProvider: SpeechProvider;
  nutritionService: NutritionService;
}

/**
 * The general section-10/16 pipeline: Voice -> Speech-to-text -> LLM
 * structured extraction -> validation -> branch on event type (food vs
 * exercise) -> domain-specific interpretation. Returns an unpersisted
 * interpretation; nothing is written to the database here. Only the first
 * extracted event is interpreted (same simplification as Phase 1's
 * food-only pipeline) — one utterance is treated as describing one thing.
 */
export async function interpretHealthEvent(
  deps: EventPipelineDeps,
  weightKg: number,
  input: EventInterpretRequest,
): Promise<InterpretedHealthEvent> {
  const sourceText =
    input.text ??
    (await deps.speechProvider.transcribe({
      audioBase64: input.audioBase64,
      mockTranscriptId: input.mockTranscriptId,
    })).text;

  // A real provider call can fail (timeout, rate limit, network error) —
  // never let that surface as an opaque 500; the user should get a normal
  // "please try again" instead of losing their spoken/typed input (section 35).
  let rawExtraction: unknown;
  try {
    rawExtraction = await deps.aiProvider.extractHealthEvents({
      text: sourceText,
      nowISO: input.nowISO,
    });
  } catch {
    throw new InterpretationFailedError();
  }

  // Never trust raw provider output — validate against the shared schema
  // before it's used anywhere downstream (spec section 34).
  const parsed = HealthExtractionResultSchema.safeParse(rawExtraction);
  if (!parsed.success) {
    throw new InterpretationFailedError();
  }

  const event = parsed.data.events[0];
  if (!event) {
    throw new InterpretationFailedError();
  }

  if (event.type === 'exercise') {
    const activity = interpretExerciseEvent(event, sourceText, weightKg);
    return { type: 'exercise', activity };
  }

  const meal = await interpretFoodEvent(event, sourceText, deps.nutritionService);
  return { type: 'food', meal };
}
