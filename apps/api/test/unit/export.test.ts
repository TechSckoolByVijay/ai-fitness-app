import { describe, expect, it } from 'vitest';
import { toCsv } from '../../src/modules/export/csv';
import {
  DAY_HEADERS,
  FOOD_HEADERS,
  buildDayRows,
  buildFoodRows,
  classifyCalorieBalance,
  type ExportDayInputs,
  type ExportFoodEntry,
} from '../../src/modules/export/export-rows';
import { localDate, localTime, resolveRange, safeTimeZone } from '../../src/modules/export/local-time';

const IST = 'Asia/Kolkata';

function item(overrides: Partial<ExportFoodEntry['items'][number]> = {}): ExportFoodEntry['items'][number] {
  return {
    name: 'chapati',
    quantity: 2,
    unit: 'piece',
    grams: 80,
    calories: 240,
    proteinG: 8,
    carbsG: 44,
    fatG: 4,
    fiberG: 6,
    editedByUser: false,
    estimatedCalories: null,
    estimatedProteinG: null,
    ...overrides,
  };
}

function entry(overrides: Partial<ExportFoodEntry> = {}): ExportFoodEntry {
  return {
    loggedAt: new Date('2026-09-20T07:30:00Z'), // 13:00 IST
    timePrecision: 'approximate',
    mealType: 'lunch',
    sourceText: 'lunch was 2 chapatis',
    items: [item()],
    ...overrides,
  };
}

describe('toCsv', () => {
  it('starts with a BOM, quotes commas and quotes, and uses CRLF', () => {
    const csv = toCsv(['a', 'b'], [['dal, rice', 'the "big" bowl']]);
    expect(csv).toBe('﻿a,b\r\n"dal, rice","the ""big"" bowl"\r\n');
  });

  it('neutralises user text that a spreadsheet would run as a formula', () => {
    const csv = toCsv(['x'], [['=HYPERLINK("http://evil")']]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });

  it('leaves negative numbers as numbers', () => {
    expect(toCsv(['x'], [[-250]])).toBe('﻿x\r\n-250\r\n');
  });

  it('writes blanks for missing values and yes/no for booleans', () => {
    expect(toCsv(['a', 'b', 'c'], [[null, true, false]])).toBe('﻿a,b,c\r\n,yes,no\r\n');
  });
});

describe('local time helpers', () => {
  it('puts an early-morning IST meal on the IST date, not the UTC one', () => {
    const instant = new Date('2026-09-19T20:00:00Z'); // 01:30 IST on the 20th
    expect(localDate(instant, IST)).toBe('2026-09-20');
    expect(localTime(instant, IST)).toBe('01:30');
  });

  it('falls back to UTC for an unknown zone', () => {
    expect(safeTimeZone('Not/AZone')).toBe('UTC');
    expect(safeTimeZone(null)).toBe('UTC');
    expect(safeTimeZone(IST)).toBe(IST);
  });
});

describe('resolveRange', () => {
  const now = new Date('2026-09-26T20:00:00Z'); // already the 27th in IST

  it("counts the last N days back from the user's today", () => {
    expect(resolveRange({ days: 7 }, IST, now)).toMatchObject({ from: '2026-09-21', to: '2026-09-27' });
  });

  it('accepts an explicit range and defaults `to` to today', () => {
    expect(resolveRange({ from: '2026-09-01' }, IST, now)).toMatchObject({ from: '2026-09-01', to: '2026-09-27' });
  });

  it('rejects a backwards range and one over a year', () => {
    expect(() => resolveRange({ from: '2026-09-10', to: '2026-09-01' }, IST, now)).toThrow();
    expect(() => resolveRange({ from: '2024-01-01', to: '2026-09-01' }, IST, now)).toThrow();
  });

  it('fetches a UTC window wide enough for any time zone', () => {
    const range = resolveRange({ from: '2026-09-10', to: '2026-09-10' }, IST, now);
    expect(range.queryStart.toISOString()).toBe('2026-09-09T00:00:00.000Z');
    expect(range.queryEnd.toISOString()).toBe('2026-09-12T00:00:00.000Z');
  });
});

describe('buildFoodRows', () => {
  it('writes one row per item with local date and time', () => {
    const rows = buildFoodRows([entry()], IST, '2026-09-20', '2026-09-20');
    expect(rows).toHaveLength(1);
    const row = Object.fromEntries(FOOD_HEADERS.map((h, i) => [h, rows[0][i]]));
    expect(row).toMatchObject({
      date: '2026-09-20',
      time: '13:00',
      meal: 'Lunch',
      food: 'chapati',
      calories: 240,
      protein_g: 8,
      edited_by_user: false,
      what_you_said: 'lunch was 2 chapatis',
    });
  });

  it('leaves the time blank for a whole-day entry', () => {
    const rows = buildFoodRows(
      [entry({ mealType: 'all_day', timePrecision: 'day', loggedAt: new Date('2026-09-20T12:00:00Z') })],
      IST,
      '2026-09-20',
      '2026-09-20',
    );
    expect(rows[0][1]).toBe('');
    expect(rows[0][3]).toBe('Through the day');
  });

  it('shows the original estimate beside a user correction', () => {
    const rows = buildFoodRows(
      [entry({ items: [item({ proteinG: 20, editedByUser: true, estimatedProteinG: 8, estimatedCalories: 240 })] })],
      IST,
      '2026-09-20',
      '2026-09-20',
    );
    expect(rows[0].slice(13, 16)).toEqual([true, 240, 8]);
  });

  it('drops entries whose local date is outside the range', () => {
    const early = entry({ loggedAt: new Date('2026-09-19T17:00:00Z') }); // 22:30 IST on the 19th
    expect(buildFoodRows([early], IST, '2026-09-20', '2026-09-20')).toHaveLength(0);
  });
});

describe('classifyCalorieBalance', () => {
  it('treats within 5% as on target', () => {
    expect(classifyCalorieBalance(2050, 2000)).toBe('on_target');
    expect(classifyCalorieBalance(1500, 2000)).toBe('deficit');
    expect(classifyCalorieBalance(2400, 2000)).toBe('surplus');
  });
});

describe('buildDayRows', () => {
  const baseInputs: ExportDayInputs = {
    foodEntries: [],
    exercise: [],
    water: [],
    weights: [],
    sleep: [],
    summaries: new Map(),
    currentTargets: { calorieTarget: 2000, proteinTarget: 80 },
  };

  function rowAsObject(row: unknown[]) {
    return Object.fromEntries(DAY_HEADERS.map((h, i) => [h, row[i]]));
  }

  it('includes days with nothing logged', () => {
    const rows = buildDayRows(baseInputs, IST, '2026-09-20', '2026-09-22', '2026-09-26');
    expect(rows).toHaveLength(3);
    expect(rowAsObject(rows[0])).toMatchObject({ logged: false, calories_in: null, status: null, water_ml: 0 });
  });

  it('adds exercise to the budget before judging the day', () => {
    const inputs: ExportDayInputs = {
      ...baseInputs,
      foodEntries: [entry({ items: [item({ calories: 2300, proteinG: 90 })] })],
      exercise: [{ loggedAt: new Date('2026-09-20T12:00:00Z'), caloriesBurned: 300, durationMin: 45 }],
    };
    const row = rowAsObject(buildDayRows(inputs, IST, '2026-09-20', '2026-09-20', '2026-09-26')[0]);
    expect(row).toMatchObject({
      calories_in: 2300,
      exercise_kcal: 300,
      calorie_budget: 2300,
      balance_kcal: 0,
      status: 'on_target',
      protein_met: true,
      exercise_min: 45,
    });
  });

  it('uses the target recorded that day, and labels a stand-in as current', () => {
    const inputs: ExportDayInputs = {
      ...baseInputs,
      foodEntries: [entry(), entry({ loggedAt: new Date('2026-09-21T07:30:00Z') })],
      summaries: new Map([['2026-09-20', { steps: 8000, calorieTarget: 1800, proteinTarget: 70 }]]),
    };
    const rows = buildDayRows(inputs, IST, '2026-09-20', '2026-09-21', '2026-09-26').map(rowAsObject);
    expect(rows[0]).toMatchObject({ calorie_target: 1800, protein_target: 70, target_source: 'that_day', steps: 8000 });
    expect(rows[1]).toMatchObject({ calorie_target: 2000, protein_target: 80, target_source: 'current' });
  });

  it('keeps the last weight of the day and sums water and sleep', () => {
    const inputs: ExportDayInputs = {
      ...baseInputs,
      water: [
        { loggedAt: new Date('2026-09-20T03:00:00Z'), amountMl: 500 },
        { loggedAt: new Date('2026-09-20T10:00:00Z'), amountMl: 750 },
      ],
      weights: [
        { loggedAt: new Date('2026-09-20T02:00:00Z'), weightKg: 72.4 },
        { loggedAt: new Date('2026-09-20T14:00:00Z'), weightKg: 72.9 },
      ],
      sleep: [{ wokeAt: new Date('2026-09-20T01:00:00Z'), durationMin: 420 }],
    };
    const row = rowAsObject(buildDayRows(inputs, IST, '2026-09-20', '2026-09-20', '2026-09-26')[0]);
    expect(row).toMatchObject({ water_ml: 1250, weight_kg: 72.9, sleep_min: 420 });
  });
});
