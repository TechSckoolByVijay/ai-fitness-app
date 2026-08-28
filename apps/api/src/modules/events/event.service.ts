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
 * exercise) -> domain-specific interpretation. Returns unpersisted
 * interpretations; nothing is written to the database here.
 *
 * One utterance can describe more than one thing — "breakfast was X, lunch
 * was Y, and I went for a walk" extracts as three separate events, each
 * interpreted independently. The common case (one meal, one utterance)
 * still returns a single-element array — callers always deal with a list,
 * never a special-cased singular/plural split.
 */
export async function interpretHealthEvents(
  deps: EventPipelineDeps,
  weightKg: number,
  input: EventInterpretRequest,
): Promise<InterpretedHealthEvent[]> {
  const sourceText = input.imageBase64
    ? '[Photo]'
    : input.text ??
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
      text: input.imageBase64 ? undefined : sourceText,
      imageBase64: input.imageBase64,
      nowISO: input.nowISO,
    });
  } catch (error) {
    // The user only ever sees the generic friendly message below (never
    // leak provider internals to the client) — but a silently swallowed
    // cause here was undebuggable in production. Server-side only.
    // eslint-disable-next-line no-console
    console.error('[interpretHealthEvents] AI provider call failed:', error);
    throw new InterpretationFailedError();
  }

  // Never trust raw provider output — validate against the shared schema
  // before it's used anywhere downstream (spec section 34).
  const parsed = HealthExtractionResultSchema.safeParse(rawExtraction);
  if (!parsed.success || parsed.data.events.length === 0) {
    throw new InterpretationFailedError();
  }

  return Promise.all(
    parsed.data.events.map(async (event): Promise<InterpretedHealthEvent> => {
      if (event.type === 'exercise') {
        const activity = interpretExerciseEvent(event, sourceText, weightKg);
        return { type: 'exercise', activity };
      }
      const meal = await interpretFoodEvent(event, sourceText, deps.nutritionService);
      return { type: 'food', meal };
    }),
  );
}
