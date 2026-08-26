import { describe, expect, it } from 'vitest';
import { buildStreakCard, buildYesterdayCard, classifyCalorieDirection } from '../../src/modules/insights/insights-logic';

describe('classifyCalorieDirection', () => {
  it('treats a deficit as favorable for lose_weight', () => {
    expect(classifyCalorieDirection('lose_weight', 1500, 2000)).toBe('favorable');
  });

  it('treats a surplus as unfavorable for lose_weight', () => {
    expect(classifyCalorieDirection('lose_weight', 2400, 2000)).toBe('unfavorable');
  });

  it('treats a surplus as favorable for gain_muscle', () => {
    expect(classifyCalorieDirection('gain_muscle', 2400, 2000)).toBe('favorable');
  });

  it('treats a deficit as unfavorable for gain_muscle', () => {
    expect(classifyCalorieDirection('gain_muscle', 1500, 2000)).toBe('unfavorable');
  });

  it('treats being close to target as favorable for maintain_weight in either direction', () => {
    expect(classifyCalorieDirection('maintain_weight', 2020, 2000)).toBe('favorable');
    expect(classifyCalorieDirection('maintain_weight', 1980, 2000)).toBe('favorable');
  });

  it('treats being far from target as neutral (not unfavorable) for maintain_weight', () => {
    expect(classifyCalorieDirection('maintain_weight', 2500, 2000)).toBe('neutral');
  });

  it('stays within a 5% tolerance band as neutral for lose_weight', () => {
    // 2000 * 0.05 = 100, so 2050 is within tolerance
    expect(classifyCalorieDirection('lose_weight', 2050, 2000)).toBe('neutral');
  });

  it('treats non-calorie-direction goals the same as maintain_weight', () => {
    expect(classifyCalorieDirection('improve_health', 2010, 2000)).toBe('favorable');
    expect(classifyCalorieDirection(null, 2010, 2000)).toBe('favorable');
  });
});

describe('buildYesterdayCard', () => {
  it('prompts profile completion when there is no calorie target', () => {
    const card = buildYesterdayCard({ goalType: 'lose_weight', calorieTarget: null, yesterdayCalories: 1800 });
    expect(card.id).toBe('no-target');
    expect(card.tone).toBe('neutral');
  });

  it('nudges (not blames) when nothing was logged yesterday', () => {
    const card = buildYesterdayCard({ goalType: 'lose_weight', calorieTarget: 2000, yesterdayCalories: null });
    expect(card.id).toBe('yesterday-no-log');
    expect(card.tone).toBe('nudge');
    expect(card.message).not.toMatch(/0 kcal/);
  });

  it('praises a deficit for a weight-loss goal', () => {
    const card = buildYesterdayCard({ goalType: 'lose_weight', calorieTarget: 2000, yesterdayCalories: 1800 });
    expect(card.tone).toBe('positive');
    expect(card.message).toContain('200 kcal under target');
  });

  it('gently nudges a surplus for a weight-loss goal, without shaming language', () => {
    const card = buildYesterdayCard({ goalType: 'lose_weight', calorieTarget: 2000, yesterdayCalories: 2300 });
    expect(card.tone).toBe('nudge');
    expect(card.message).toContain('300 kcal over target');
    expect(card.message.toLowerCase()).not.toMatch(/fail|bad|wrong/);
  });

  it('praises a surplus for a muscle-gain goal (inverse of weight-loss framing)', () => {
    const card = buildYesterdayCard({ goalType: 'gain_muscle', calorieTarget: 2500, yesterdayCalories: 2800 });
    expect(card.tone).toBe('positive');
    expect(card.message).toContain('300 kcal over target');
    expect(card.message).toMatch(/muscle/i);
  });

  it('nudges a deficit for a muscle-gain goal', () => {
    const card = buildYesterdayCard({ goalType: 'gain_muscle', calorieTarget: 2500, yesterdayCalories: 2100 });
    expect(card.tone).toBe('nudge');
  });

  it('never states diagnostic or prescriptive language for any goal', () => {
    const goals: Array<Parameters<typeof buildYesterdayCard>[0]['goalType']> = [
      'lose_weight',
      'gain_muscle',
      'maintain_weight',
      'improve_health',
      null,
    ];
    for (const goalType of goals) {
      const card = buildYesterdayCard({ goalType, calorieTarget: 2000, yesterdayCalories: 1900 });
      expect(card.message.toLowerCase()).not.toMatch(/diagnos|prescri|disease|deficiency|medication/);
    }
  });
});

describe('buildStreakCard', () => {
  it('returns null when there is no calorie target', () => {
    expect(buildStreakCard({ goalType: 'lose_weight', calorieTarget: null, dailyCalories: [1800, 1800] })).toBeNull();
  });

  it('returns null for a streak shorter than 2 days', () => {
    const card = buildStreakCard({ goalType: 'lose_weight', calorieTarget: 2000, dailyCalories: [2400, 1800] });
    expect(card).toBeNull();
  });

  it('counts consecutive favorable days ending at the last entry (yesterday)', () => {
    const card = buildStreakCard({
      goalType: 'lose_weight',
      calorieTarget: 2000,
      dailyCalories: [2400, 1700, 1750, 1800],
    });
    expect(card?.message).toContain('3 days in a row');
  });

  it('stops counting at the first non-favorable day walking backward', () => {
    const card = buildStreakCard({
      goalType: 'lose_weight',
      calorieTarget: 2000,
      dailyCalories: [1800, 1800, 2400, 1800, 1800],
    });
    // Only the last two (favorable) count; the 2400 three days back breaks it.
    expect(card?.message).toContain('2 days in a row');
  });

  it('treats a zero/missing day as breaking the streak', () => {
    const card = buildStreakCard({ goalType: 'lose_weight', calorieTarget: 2000, dailyCalories: [1800, 0, 1800] });
    expect(card).toBeNull();
  });
});
