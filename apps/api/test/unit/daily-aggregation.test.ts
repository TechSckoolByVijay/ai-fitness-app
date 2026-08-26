import { describe, expect, it } from 'vitest';
import { sumEntryNutrition, sumSleepMinutes, sumWaterMl, toDateOnly } from '../../src/modules/daily-summary';

describe('sumEntryNutrition', () => {
  it('sums nutrition across multiple entries and items', () => {
    const entries = [
      {
        items: [
          { nutrition: { calories: 100, proteinG: 5, carbsG: 20, fatG: 2, fiberG: 3 } },
          { nutrition: { calories: 50, proteinG: 2, carbsG: 10, fatG: 1, fiberG: 1 } },
        ],
      },
      {
        items: [{ nutrition: { calories: 200, proteinG: 10, carbsG: 30, fatG: 5, fiberG: 4 } }],
      },
    ];

    const totals = sumEntryNutrition(entries);
    expect(totals.calories).toBe(350);
    expect(totals.proteinG).toBe(17);
    expect(totals.carbsG).toBe(60);
    expect(totals.fatG).toBe(8);
    expect(totals.fiberG).toBe(8);
  });

  it('handles Prisma Decimal-like string values (as returned from the DB) correctly', () => {
    const entries = [
      { items: [{ nutrition: { calories: '105.00', proteinG: '1.30', carbsG: '27.10', fatG: '0.40', fiberG: '3.10' } }] },
    ];
    const totals = sumEntryNutrition(entries);
    expect(totals.calories).toBe(105);
    expect(totals.proteinG).toBe(1.3);
  });

  it('skips items with no nutrition record (defensive, should not throw)', () => {
    const entries = [{ items: [{ nutrition: null }, { nutrition: { calories: 50, proteinG: 1, carbsG: 5, fatG: 1, fiberG: 0 } }] }];
    const totals = sumEntryNutrition(entries);
    expect(totals.calories).toBe(50);
  });

  it('defaults missing fiberG to 0', () => {
    const entries = [{ items: [{ nutrition: { calories: 50, proteinG: 1, carbsG: 5, fatG: 1 } }] }];
    const totals = sumEntryNutrition(entries);
    expect(totals.fiberG).toBe(0);
  });

  it('returns all zeros for an empty entry list', () => {
    const totals = sumEntryNutrition([]);
    expect(totals).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 });
  });
});

describe('toDateOnly', () => {
  it('truncates a UTC datetime to midnight UTC of the same day', () => {
    const result = toDateOnly(new Date('2026-08-25T14:37:12.123Z'));
    expect(result.toISOString()).toBe('2026-08-25T00:00:00.000Z');
  });
});

describe('sumWaterMl', () => {
  it('sums amountMl across multiple entries', () => {
    expect(sumWaterMl([{ amountMl: 250 }, { amountMl: 500 }, { amountMl: 250 }])).toBe(1000);
  });

  it('returns 0 for no entries', () => {
    expect(sumWaterMl([])).toBe(0);
  });
});

describe('sumSleepMinutes', () => {
  it('sums durationMin across multiple entries (e.g. a nap plus the main night sleep)', () => {
    expect(sumSleepMinutes([{ durationMin: 420 }, { durationMin: 30 }])).toBe(450);
  });

  it('returns 0 for no entries', () => {
    expect(sumSleepMinutes([])).toBe(0);
  });
});
