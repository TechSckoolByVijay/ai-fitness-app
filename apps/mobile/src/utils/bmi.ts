export interface BmiResult {
  value: number;
  category: 'underweight' | 'healthy' | 'overweight' | 'obese';
  label: string;
  /** 0-100 position along the standard 15-40 BMI scale, for the marker on the scale bar. */
  scalePct: number;
}

const SCALE_MIN = 15;
const SCALE_MAX = 40;

/**
 * Standard WHO adult BMI. Wellness-framing only: category labels describe
 * the standard BMI ranges, and the UI copy around this must never diagnose
 * or prescribe (Play Store health-app guidance).
 */
export function computeBmi(heightCm: number, weightKg: number): BmiResult | null {
  if (heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  const value = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

  let category: BmiResult['category'];
  let label: string;
  if (value < 18.5) {
    category = 'underweight';
    label = 'Underweight range';
  } else if (value < 25) {
    category = 'healthy';
    label = 'Healthy range';
  } else if (value < 30) {
    category = 'overweight';
    label = 'Overweight range';
  } else {
    category = 'obese';
    label = 'Obese range';
  }

  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, value));
  const scalePct = Math.round(((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100);

  return { value, category, label, scalePct };
}
