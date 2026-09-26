/**
 * The work the server really does for one interpret call, in order. Only the
 * pacing on screen is simulated — the request is a single round trip — so
 * the steps advance on a timer and the last one waits until the answer
 * arrives rather than pretending to finish.
 */
export const TEXT_STEPS = [
  'Reading what you said',
  'Finding the foods and activities',
  'Looking up calories and protein',
  'Adding it all up',
] as const;

export const PHOTO_STEPS = [
  'Looking at your photo',
  'Recognising the foods',
  'Estimating portions',
  'Looking up calories and protein',
] as const;

export const STEP_INTERVAL_MS = 1400;
/** When to admit it's slow — usually the AI provider, not the user. */
export const SLOW_AFTER_MS = 8000;

/** Index of the step currently in progress. Never runs past the last step. */
export function activeStepIndex(elapsedMs: number, stepCount: number): number {
  return Math.min(stepCount - 1, Math.floor(Math.max(0, elapsedMs) / STEP_INTERVAL_MS));
}
