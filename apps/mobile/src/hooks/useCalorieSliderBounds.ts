import { useRef } from 'react';
import { calorieSliderBounds } from '../utils/nutritionOverride';
import { nextCalorieBaseline, type CalorieBaseline } from '../utils/calorieSliderBaseline';

/**
 * Returns a `getBounds(index, quantity, liveCalories)` function that gives
 * each meal item's calorie slider stable min/max bounds — frozen against
 * quantity changes only, never against the slider's own live value. See
 * `nextCalorieBaseline` for why that distinction matters.
 *
 * `resetKey` should identify "which meal/interpretation this is" (e.g. the
 * source text or entry id) — item index alone isn't a stable identity
 * across a brand-new interpretation, so baselines are cleared whenever it
 * changes.
 */
export function useCalorieSliderBounds(resetKey: string) {
  const baselines = useRef<Map<number, CalorieBaseline>>(new Map());
  const lastResetKey = useRef(resetKey);

  if (lastResetKey.current !== resetKey) {
    baselines.current = new Map();
    lastResetKey.current = resetKey;
  }

  return function getBounds(index: number, quantity: number, liveCalories: number) {
    const next = nextCalorieBaseline(baselines.current.get(index), quantity, liveCalories);
    baselines.current.set(index, next);
    return calorieSliderBounds(next.calories);
  };
}
