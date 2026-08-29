import { getCalorieStatusTone, TONE_STYLES } from './statusTone';

describe('getCalorieStatusTone', () => {
  it('returns neutral when there is no target to compare against', () => {
    expect(getCalorieStatusTone('lose_weight', 500, null, 0)).toBe('neutral');
    expect(getCalorieStatusTone('lose_weight', 500, 0, 0)).toBe('neutral');
  });

  it('flags going over the full day budget as critical regardless of goal', () => {
    expect(getCalorieStatusTone('lose_weight', 2100, 2000, 1000)).toBe('critical');
    expect(getCalorieStatusTone('gain_muscle', 2100, 2000, 1000)).toBe('critical');
    expect(getCalorieStatusTone(null, 2100, 2000, 1000)).toBe('critical');
  });

  it('does not treat exactly hitting the target as over budget', () => {
    expect(getCalorieStatusTone('lose_weight', 2000, 2000, 2000)).not.toBe('critical');
  });

  it('stays neutral before the eating window opens', () => {
    expect(getCalorieStatusTone('lose_weight', 0, 2000, 0)).toBe('neutral');
  });

  it('is goal-aware: eating above pace cautions when losing but not when gaining', () => {
    // 1400 consumed against 1000 expected-by-now, well outside tolerance.
    expect(getCalorieStatusTone('lose_weight', 1400, 2000, 1000)).toBe('caution');
    expect(getCalorieStatusTone('gain_muscle', 1400, 2000, 1000)).toBe('positive');
  });

  it('is goal-aware in the other direction too', () => {
    expect(getCalorieStatusTone('lose_weight', 600, 2000, 1000)).toBe('positive');
    expect(getCalorieStatusTone('gain_muscle', 600, 2000, 1000)).toBe('caution');
  });

  it('gives every tone a distinct surface, glyph and label', () => {
    const tones = Object.values(TONE_STYLES);
    // The whole point of this module: a warning must not render identically
    // to praise. Guard against a future edit collapsing them again.
    expect(new Set(tones.map((t) => t.heroContainer)).size).toBe(tones.length);
    expect(new Set(tones.map((t) => t.softContainer)).size).toBe(tones.length);
    expect(new Set(tones.map((t) => t.icon)).size).toBe(tones.length);
    expect(new Set(tones.map((t) => t.label)).size).toBe(tones.length);
    expect(new Set(tones.map((t) => t.softIcon)).size).toBe(tones.length);
  });
});
