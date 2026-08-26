export interface CalorieBaseline {
  quantity: number;
  calories: number;
}

/**
 * Decides what calorie value a slider's min/max bounds should be computed
 * from. Returns the SAME baseline (frozen) when quantity hasn't changed
 * since the last call — even if `liveCalories` has drifted from dragging
 * the slider itself — and a FRESH baseline (the live value) when quantity
 * just changed via the +/- buttons, since that's a deliberate new estimate
 * worth trusting.
 *
 * This exists because recomputing bounds from the live (possibly
 * already-slider-adjusted) calories on every render creates a runaway
 * feedback loop with the native slider: each drag event nudges the value,
 * which widens bounds computed from that new value, which the slider
 * library reinterprets the same finger position against — producing a new,
 * larger value even with the finger held still. In practice this reached
 * multi-million-kcal readings within one drag gesture.
 */
export function nextCalorieBaseline(
  previous: CalorieBaseline | undefined,
  quantity: number,
  liveCalories: number,
): CalorieBaseline {
  if (!previous || previous.quantity !== quantity) {
    return { quantity, calories: liveCalories };
  }
  return previous;
}
