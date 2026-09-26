import { dayPrecisionLoggedAt } from '@fitness-app/shared';
import { describe, expect, it } from 'vitest';
import { isLiveDay, toDateOnly } from '../../src/modules/daily-summary';
import { MockAIProvider } from '../../src/providers/ai/mock-ai.provider';
import { extractWater, isWholeDayTotals } from '../../src/providers/ai/parsing-utils';

describe('dayPrecisionLoggedAt', () => {
  it("pins a day-only entry to noon UTC on the user's own date", () => {
    expect(dayPrecisionLoggedAt('2026-09-20T01:30:00+05:30')).toBe('2026-09-20T12:00:00.000Z');
    expect(dayPrecisionLoggedAt('2026-09-20')).toBe('2026-09-20T12:00:00.000Z');
  });

  it('rejects something that is not a date', () => {
    expect(() => dayPrecisionLoggedAt('yesterday')).toThrow();
  });
});

describe('extractWater', () => {
  it('converts litres and glasses to ml and removes the phrase', () => {
    expect(extractWater('6 chapatis, 3 litres of water and 1 litre of milk')).toEqual({
      amountMl: 3000,
      remainingText: '6 chapatis and 1 litre of milk',
    });
    expect(extractWater('I drank eight glasses of water')?.amountMl).toBe(2000);
  });

  it('ignores drinks that are not plain water', () => {
    expect(extractWater('a litre of milk and two cups of tea')).toBeNull();
  });
});

describe('isWholeDayTotals', () => {
  it('recognises day totals with no meal named', () => {
    expect(isWholeDayTotals('Today I had 4 cups of tea and 6 chapatis')).toBe(true);
    expect(isWholeDayTotals('Today for lunch I had 3 chapatis')).toBe(false);
    expect(isWholeDayTotals('I had 2 chapatis')).toBe(false);
  });
});

describe('MockAIProvider whole-day logging', () => {
  it('splits day totals into one all-day food event and a water event', async () => {
    const result = await new MockAIProvider().extractHealthEvents({
      text: 'Today I had 4 cups of tea, 6 chapatis and 3 litres of water',
      nowISO: '2026-09-20T21:00:00+05:30',
    });
    const food = result.events.find((e) => e.type === 'food');
    const water = result.events.find((e) => e.type === 'water');
    expect(food).toMatchObject({ mealType: 'all_day', timePrecision: 'day' });
    expect(water).toMatchObject({ amountMl: 3000 });
  });
});

describe('isLiveDay', () => {
  it('is true for today and false for last month', () => {
    const now = new Date('2026-09-20T10:00:00Z');
    expect(isLiveDay(toDateOnly(now), now)).toBe(true);
    expect(isLiveDay(new Date('2026-08-20T00:00:00Z'), now)).toBe(false);
  });
});
