import { computeBmi } from './bmi';

describe('computeBmi', () => {
  it('computes the standard BMI value rounded to one decimal', () => {
    // 90.5 kg at 175 cm → 90.5 / 1.75^2 = 29.6
    expect(computeBmi(175, 90.5)?.value).toBe(29.6);
  });

  it('classifies the standard WHO ranges', () => {
    expect(computeBmi(175, 52)?.category).toBe('underweight'); // ~17.0
    expect(computeBmi(175, 68)?.category).toBe('healthy'); // ~22.2
    expect(computeBmi(175, 85)?.category).toBe('overweight'); // ~27.8
    expect(computeBmi(175, 95)?.category).toBe('obese'); // ~31.0
  });

  it('positions the scale marker within 0-100 even for extreme values', () => {
    expect(computeBmi(175, 30)!.scalePct).toBe(0); // BMI ~9.8, clamped to scale start
    expect(computeBmi(150, 150)!.scalePct).toBe(100); // BMI ~66, clamped to scale end
    const mid = computeBmi(175, 76)!; // ~24.8 → just inside healthy
    expect(mid.scalePct).toBeGreaterThan(0);
    expect(mid.scalePct).toBeLessThan(100);
  });

  it('returns null for missing/invalid inputs', () => {
    expect(computeBmi(0, 80)).toBeNull();
    expect(computeBmi(175, 0)).toBeNull();
  });
});
