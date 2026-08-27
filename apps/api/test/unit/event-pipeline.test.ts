import type { HealthExtractionResult } from '@fitness-app/shared';
import { describe, expect, it } from 'vitest';
import { interpretHealthEvents } from '../../src/modules/events/event.service';
import { MockNutritionProvider } from '../../src/providers/nutrition/mock-nutrition.provider';
import { MockSpeechProvider } from '../../src/providers/speech/mock-speech.provider';
import type { AIProvider, CoachChatMessage, CoachContextInput } from '../../src/providers/ai/ai-provider.interface';

/**
 * A whole-day utterance ("breakfast was X, lunch was Y, I went for a walk")
 * needs the AI provider to actually return multiple events for
 * interpretHealthEvents to split correctly — the rule-based MockAIProvider
 * doesn't attempt that NLP (reasonably out of scope for a keyword parser),
 * so this stubs the provider directly to prove the pipeline itself handles
 * a multi-event response correctly. The real OpenAI provider's prompt is
 * what actually produces multiple events in production.
 */
class StubMultiEventAIProvider implements AIProvider {
  constructor(private readonly result: HealthExtractionResult) {}

  async extractHealthEvents(): Promise<HealthExtractionResult> {
    return this.result;
  }

  async coachChat(_input: { messages: CoachChatMessage[]; context: CoachContextInput }): Promise<string> {
    return 'stub reply';
  }
}

describe('interpretHealthEvents (multi-event pipeline)', () => {
  it('interprets multiple food events from a single utterance as separate meals', async () => {
    const aiProvider = new StubMultiEventAIProvider({
      events: [
        {
          type: 'food',
          timestamp: '2026-08-27T08:00:00.000Z',
          mealType: 'breakfast',
          items: [{ name: 'banana', quantity: 1, unit: 'whole', confidence: 0.9 }],
        },
        {
          type: 'food',
          timestamp: '2026-08-27T13:00:00.000Z',
          mealType: 'lunch',
          items: [{ name: 'chapati', quantity: 3, unit: 'medium', confidence: 0.9 }],
        },
      ],
    });

    const events = await interpretHealthEvents(
      { aiProvider, speechProvider: new MockSpeechProvider(), nutritionService: new MockNutritionProvider() },
      70,
      { text: 'breakfast was a banana, lunch was three chapatis', nowISO: '2026-08-27T14:00:00.000Z' },
    );

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('food');
    expect(events[1].type).toBe('food');
    if (events[0].type === 'food' && events[1].type === 'food') {
      expect(events[0].meal.mealType).toBe('breakfast');
      expect(events[0].meal.items[0].name).toBe('banana');
      expect(events[1].meal.mealType).toBe('lunch');
      expect(events[1].meal.items[0].name).toBe('chapati');
    }
  });

  it('interprets a mix of food and exercise events from one utterance', async () => {
    const aiProvider = new StubMultiEventAIProvider({
      events: [
        {
          type: 'food',
          timestamp: '2026-08-27T08:00:00.000Z',
          mealType: 'breakfast',
          items: [{ name: 'banana', quantity: 1, unit: 'whole', confidence: 0.9 }],
        },
        {
          type: 'exercise',
          timestamp: '2026-08-27T18:00:00.000Z',
          activityType: 'walking',
          durationMinutes: 20,
          steps: undefined,
          distanceKm: undefined,
          intensity: undefined,
          confidence: 0.9,
        },
      ],
    });

    const events = await interpretHealthEvents(
      { aiProvider, speechProvider: new MockSpeechProvider(), nutritionService: new MockNutritionProvider() },
      70,
      { text: 'had a banana for breakfast and walked 20 minutes in the evening', nowISO: '2026-08-27T19:00:00.000Z' },
    );

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('food');
    expect(events[1].type).toBe('exercise');
    if (events[1].type === 'exercise') {
      expect(events[1].activity.activityType).toBe('walking');
      expect(events[1].activity.durationMinutes).toBeGreaterThan(0);
    }
  });

  it('still returns a single-element array for the common single-meal case', async () => {
    const aiProvider = new StubMultiEventAIProvider({
      events: [
        {
          type: 'food',
          timestamp: '2026-08-27T08:00:00.000Z',
          mealType: 'breakfast',
          items: [{ name: 'banana', quantity: 1, unit: 'whole', confidence: 0.9 }],
        },
      ],
    });

    const events = await interpretHealthEvents(
      { aiProvider, speechProvider: new MockSpeechProvider(), nutritionService: new MockNutritionProvider() },
      70,
      { text: 'I ate a banana', nowISO: '2026-08-27T08:05:00.000Z' },
    );

    expect(events).toHaveLength(1);
  });
});
