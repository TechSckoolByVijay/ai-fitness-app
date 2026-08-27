import { expectedCaloriesByNow, getCaloriePace } from './calorieProgress';

function at(hour: number, minute = 0): Date {
  const d = new Date('2026-08-27T00:00:00');
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe('expectedCaloriesByNow', () => {
  it('expects nothing before the eating window opens', () => {
    expect(expectedCaloriesByNow(2000, at(6))).toBe(0);
  });

  it('expects the full target once the eating window closes', () => {
    expect(expectedCaloriesByNow(2000, at(23))).toBe(2000);
  });

  it('is roughly half the target at the midpoint of the eating window (7am-10pm)', () => {
    // midpoint of 7-22 is 14:30
    const result = expectedCaloriesByNow(2000, at(14, 30));
    expect(result).toBeCloseTo(1000, -1);
  });

  it('increases monotonically through the day', () => {
    const morning = expectedCaloriesByNow(2000, at(9));
    const afternoon = expectedCaloriesByNow(2000, at(14));
    const evening = expectedCaloriesByNow(2000, at(20));
    expect(morning).toBeLessThan(afternoon);
    expect(afternoon).toBeLessThan(evening);
  });
});

describe('getCaloriePace', () => {
  it('says nothing is expected yet before the eating window opens', () => {
    const pace = getCaloriePace('lose_weight', 0, 2000, at(6));
    expect(pace.expectedByNow).toBe(0);
    expect(pace.message).toMatch(/nothing expected/i);
  });

  it('praises being under pace for a weight-loss goal', () => {
    const pace = getCaloriePace('lose_weight', 200, 2000, at(14, 30)); // expected ~1000
    expect(pace.alignment).toBe('favorable');
    expect(pace.message.toLowerCase()).toContain('deficit');
  });

  it('flags being over pace for a weight-loss goal without shaming language', () => {
    const pace = getCaloriePace('lose_weight', 1800, 2000, at(14, 30)); // expected ~1000
    expect(pace.alignment).toBe('unfavorable');
    expect(pace.message.toLowerCase()).not.toMatch(/fail|bad|wrong/);
  });

  it('praises being over pace for a muscle-gain goal (inverse framing)', () => {
    const pace = getCaloriePace('gain_muscle', 1800, 2500, at(14, 30)); // expected ~1250
    expect(pace.alignment).toBe('favorable');
  });

  it('never emits diagnostic or prescriptive language', () => {
    const goals: Array<Parameters<typeof getCaloriePace>[0]> = ['lose_weight', 'gain_muscle', null];
    for (const goalType of goals) {
      const pace = getCaloriePace(goalType, 900, 2000, at(14, 30));
      expect(pace.message.toLowerCase()).not.toMatch(/diagnos|prescri|disease|deficiency|medication/);
    }
  });
});
