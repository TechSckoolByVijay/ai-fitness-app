/**
 * The onboarding flow in order.
 *
 * Body info is deliberately one question per screen rather than a single
 * form with thirteen controls on it — each screen asks one thing with one
 * big control, which is what makes the flow feel light instead of like a
 * registration form. That means more steps, so step numbers are derived
 * from this list rather than hardcoded in each screen where they would
 * drift the moment a step is added or removed.
 */
export const ONBOARDING_STEPS = [
  'account',
  'sex',
  'dob',
  'height',
  'weight',
  'activity',
  'goal',
  'diet',
  'allergies',
  'health',
  'tour',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

export function stepNumber(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step) + 1;
}

/**
 * The route to push after finishing `step`.
 *
 * Returns a template-literal type rather than plain `string` so expo-router's
 * typed navigation still checks the destination exists — a bare `string`
 * silently opts out of that.
 */
export function nextStepRoute(step: OnboardingStep): `/${OnboardingStep}` {
  const next = ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1];
  return `/${next}`;
}
