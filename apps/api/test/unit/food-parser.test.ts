import { FoodExtractionResultSchema, HealthExtractionResultSchema, type FoodExtractionEvent } from '@fitness-app/shared';
import { describe, expect, it } from 'vitest';
import { MockAIProvider } from '../../src/providers/ai/mock-ai.provider';

function asFoodEvent(event: { type: string }): FoodExtractionEvent {
  if (event.type !== 'food') throw new Error(`Expected a food event, got ${event.type}`);
  return event as FoodExtractionEvent;
}

describe('HealthExtractionResultSchema validation (spec section 34 boundary)', () => {
  it('accepts well-formed output from the mock AI provider', async () => {
    const ai = new MockAIProvider();
    const raw = await ai.extractHealthEvents({ text: 'I ate a banana.', nowISO: '2026-08-25T09:00:00.000Z' });
    const parsed = HealthExtractionResultSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  it('rejects an events array with no items', () => {
    const malformed = { events: [{ type: 'food', timestamp: '2026-08-25T09:00:00.000Z', items: [] }] };
    const parsed = FoodExtractionResultSchema.safeParse(malformed);
    expect(parsed.success).toBe(false);
  });

  it('rejects a confidence value outside [0, 1]', () => {
    const malformed = {
      events: [
        {
          type: 'food',
          timestamp: '2026-08-25T09:00:00.000Z',
          items: [{ name: 'banana', quantity: 1, unit: 'whole', confidence: 1.5 }],
        },
      ],
    };
    const parsed = FoodExtractionResultSchema.safeParse(malformed);
    expect(parsed.success).toBe(false);
  });

  it('rejects a negative or zero quantity', () => {
    const malformed = {
      events: [
        {
          type: 'food',
          timestamp: '2026-08-25T09:00:00.000Z',
          items: [{ name: 'banana', quantity: 0, unit: 'whole', confidence: 0.9 }],
        },
      ],
    };
    const parsed = FoodExtractionResultSchema.safeParse(malformed);
    expect(parsed.success).toBe(false);
  });

  it('rejects a completely empty events array', () => {
    const parsed = FoodExtractionResultSchema.safeParse({ events: [] });
    expect(parsed.success).toBe(false);
  });

  it('rejects an object missing the events key entirely (e.g. a raw string from a misbehaving provider)', () => {
    const parsed = FoodExtractionResultSchema.safeParse('I ate a banana');
    expect(parsed.success).toBe(false);
  });
});

describe('MockAIProvider example coverage', () => {
  const ai = new MockAIProvider();

  it('parses "I ate a banana." into a single high-confidence item', async () => {
    const result = await ai.extractHealthEvents({ text: 'I ate a banana.', nowISO: '2026-08-25T09:00:00.000Z' });
    const items = asFoodEvent(result.events[0]).items;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('banana');
    expect(items[0].confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('parses the multi-item chapati/curry/salad sentence into 3 items', async () => {
    const result = await ai.extractHealthEvents({
      text: "At 12 o'clock I ate two medium chapatis, around 200 grams of less-oily medium-spicy curry, and a bowl of salad.",
      nowISO: '2026-08-25T09:00:00.000Z',
    });
    const items = asFoodEvent(result.events[0]).items;
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.name)).toEqual(['chapati', 'curry', 'salad']);
  });

  it('produces a lower confidence for "some curry" than "a bowl of curry"', async () => {
    const vague = await ai.extractHealthEvents({ text: 'I had some curry.', nowISO: '2026-08-25T09:00:00.000Z' });
    const specific = await ai.extractHealthEvents({
      text: 'I had a bowl of curry.',
      nowISO: '2026-08-25T09:00:00.000Z',
    });
    expect(asFoodEvent(vague.events[0]).items[0].confidence).toBeLessThan(
      asFoodEvent(specific.events[0]).items[0].confidence,
    );
  });

  it('parses "I walked for 30 minutes." into an exercise event with no calories computed by the AI', async () => {
    const result = await ai.extractHealthEvents({ text: 'I walked for 30 minutes.', nowISO: '2026-08-25T09:00:00.000Z' });
    const event = result.events[0];
    expect(event.type).toBe('exercise');
    if (event.type === 'exercise') {
      expect(event.activityType).toBe('walking');
      expect(event.durationMinutes).toBe(30);
      expect(event.confidence).toBeGreaterThanOrEqual(0.8);
      expect(event).not.toHaveProperty('caloriesBurned');
    }
  });

  it('parses "I played badminton for an hour." into an exercise event with duration converted to minutes', async () => {
    const result = await ai.extractHealthEvents({
      text: 'I played badminton for an hour.',
      nowISO: '2026-08-25T09:00:00.000Z',
    });
    const event = result.events[0];
    expect(event.type).toBe('exercise');
    if (event.type === 'exercise') {
      expect(event.activityType).toBe('badminton');
      expect(event.durationMinutes).toBe(60);
    }
  });

  it('parses "I walked 1000 steps." into an exercise event carrying steps', async () => {
    const result = await ai.extractHealthEvents({ text: 'I walked 1000 steps.', nowISO: '2026-08-25T09:00:00.000Z' });
    const event = result.events[0];
    expect(event.type).toBe('exercise');
    if (event.type === 'exercise') {
      expect(event.steps).toBe(1000);
    }
  });
});
