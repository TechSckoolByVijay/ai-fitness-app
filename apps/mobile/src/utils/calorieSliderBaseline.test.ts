import { nextCalorieBaseline } from './calorieSliderBaseline';

describe('nextCalorieBaseline', () => {
  it('adopts the live value as the baseline on first call', () => {
    const result = nextCalorieBaseline(undefined, 2, 130);
    expect(result).toEqual({ quantity: 2, calories: 130 });
  });

  it('freezes the baseline when quantity is unchanged, ignoring a drifted live value', () => {
    const previous = { quantity: 2, calories: 130 };
    const result = nextCalorieBaseline(previous, 2, 5510145);
    expect(result).toBe(previous);
  });

  it('adopts a fresh baseline when quantity changes', () => {
    const previous = { quantity: 2, calories: 130 };
    const result = nextCalorieBaseline(previous, 3, 195);
    expect(result).toEqual({ quantity: 3, calories: 195 });
  });

  it('never lets a slider drag runaway compound across repeated calls at the same quantity', () => {
    let baseline = nextCalorieBaseline(undefined, 2, 130);
    for (const drifted of [200, 5000, 5510145]) {
      baseline = nextCalorieBaseline(baseline, 2, drifted);
    }
    expect(baseline.calories).toBe(130);
  });
});
