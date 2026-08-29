import {
  cmToFeetInches,
  feetInchesToCm,
  formatHeight,
  formatWeight,
  kgToDisplayWeight,
  kgToLb,
  lbToKg,
  weightInputToKg,
} from '@fitness-app/shared';

describe('weight conversion', () => {
  it('round-trips kg through pounds without drift', () => {
    for (const kg of [45, 70.5, 90.2, 120]) {
      expect(lbToKg(kgToLb(kg))).toBeCloseTo(kg, 10);
    }
  });

  it('uses the exact international pound definition', () => {
    // 1 lb === 0.45359237 kg exactly, so 100 kg is 220.462... lb.
    expect(kgToLb(100)).toBeCloseTo(220.46226218, 6);
  });

  it('formats to a sensible precision for each system', () => {
    // A pound is already finer than 0.5 kg, so decimals there are false precision.
    expect(formatWeight(90.24, 'metric')).toBe('90.2 kg');
    expect(formatWeight(90.2, 'imperial')).toBe('199 lb');
  });

  it('converts an entered value back to kg for storage', () => {
    expect(weightInputToKg(70.5, 'metric')).toBe(70.5);
    expect(weightInputToKg(199, 'imperial')).toBeCloseTo(90.26, 2);
  });

  it('is symmetric between input and display', () => {
    const stored = 90.2;
    expect(weightInputToKg(kgToDisplayWeight(stored, 'metric'), 'metric')).toBeCloseTo(stored, 1);
    expect(weightInputToKg(kgToDisplayWeight(stored, 'imperial'), 'imperial')).toBeCloseTo(stored, 0);
  });
});

describe('height conversion', () => {
  it('round-trips centimetres through feet and inches', () => {
    for (const cm of [152, 170, 183]) {
      const { feet, inches } = cmToFeetInches(cm);
      expect(feetInchesToCm(feet, inches)).toBeCloseTo(cm, 0);
    }
  });

  it('carries into the next foot instead of rendering 12 inches', () => {
    // 182.6cm rounds to 72 inches; naive division would render 5'12".
    expect(cmToFeetInches(182.6)).toEqual({ feet: 6, inches: 0 });
    expect(formatHeight(182.6, 'imperial')).toBe(`6'0"`);
  });

  it('formats each system in its own idiom', () => {
    expect(formatHeight(170, 'metric')).toBe('170 cm');
    expect(formatHeight(170, 'imperial')).toBe(`5'7"`);
  });
});
