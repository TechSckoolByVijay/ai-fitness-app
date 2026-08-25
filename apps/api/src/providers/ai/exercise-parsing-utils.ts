import type { ActivityType, Intensity } from '@fitness-app/shared';

const ACTIVITY_KEYWORDS: Array<{ pattern: RegExp; activityType: ActivityType }> = [
  { pattern: /\bwalk(?:ed|ing)?\b/, activityType: 'walking' },
  { pattern: /\b(?:ran|running|jog(?:ged|ging)?)\b/, activityType: 'running' },
  { pattern: /\b(?:cycl(?:ed|ing)|bik(?:ed|ing))\b/, activityType: 'cycling' },
  { pattern: /\b(?:swam|swim(?:ming)?)\b/, activityType: 'swimming' },
  { pattern: /\byoga\b/, activityType: 'yoga' },
  { pattern: /\bbadminton\b/, activityType: 'badminton' },
  { pattern: /\btennis\b/, activityType: 'tennis' },
  { pattern: /\b(?:football|soccer)\b/, activityType: 'football' },
  { pattern: /\bbasketball\b/, activityType: 'basketball' },
  { pattern: /\bcricket\b/, activityType: 'cricket' },
  { pattern: /\b(?:weight[\s-]?training|lifted weights|weightlifting)\b/, activityType: 'weight_training' },
  { pattern: /\b(?:gym|workout|worked out)\b/, activityType: 'gym_workout' },
  { pattern: /\bdanc(?:ed|ing)\b/, activityType: 'dancing' },
  { pattern: /\bhik(?:ed|ing)\b/, activityType: 'hiking' },
  { pattern: /\b(?:exercis(?:ed|ing)|played sports?)\b/, activityType: 'other' },
];

const DEFAULT_DURATION_MINUTES_WHEN_UNSPECIFIED = 10;

export interface ParsedExercise {
  activityType: ActivityType;
  durationMinutes?: number;
  steps?: number;
  distanceKm?: number;
  intensity?: Intensity;
  confidence: number;
}

/** Returns null when the text doesn't appear to describe a physical activity at all (so the caller falls back to food parsing). */
export function tryParseExercise(text: string): ParsedExercise | null {
  const lower = text.toLowerCase();
  const activityMatch = ACTIVITY_KEYWORDS.find((k) => k.pattern.test(lower));
  if (!activityMatch) return null;

  const stepsMatch = lower.match(/([\d,]+)\s*steps?\b/);
  const steps = stepsMatch ? parseInt(stepsMatch[1].replace(/,/g, ''), 10) : undefined;

  const durationMatch = lower.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/);
  const wordDurationMatch = lower.match(/\b(?:a|an|one)\s+(hour|minute|min)\b/);
  let durationMinutes: number | undefined;
  if (durationMatch) {
    const value = parseFloat(durationMatch[1]);
    durationMinutes = /^h/.test(durationMatch[2]) ? value * 60 : value;
  } else if (wordDurationMatch) {
    durationMinutes = /^hour/.test(wordDurationMatch[1]) ? 60 : 1;
  }

  const distanceMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?)\b/);
  const distanceKm = distanceMatch ? parseFloat(distanceMatch[1]) : undefined;

  let intensity: Intensity | undefined;
  if (/\b(?:light|easy|gentle)\b/.test(lower)) intensity = 'light';
  else if (/\b(?:intense|vigorous|hard)\b/.test(lower)) intensity = 'vigorous';

  const hasQuantity = durationMinutes !== undefined || steps !== undefined || distanceKm !== undefined;
  const isSpecificActivity = activityMatch.activityType !== 'other';

  // Same calibration philosophy as the food parser: specific + quantified ->
  // high; specific-but-vague or generic-but-quantified -> medium; generic
  // and vague -> low (never silently assume a big duration — section 11).
  let confidence: number;
  if (isSpecificActivity && hasQuantity) confidence = 0.9;
  else if (isSpecificActivity || hasQuantity) confidence = 0.55;
  else confidence = 0.2;

  return {
    activityType: activityMatch.activityType,
    durationMinutes: durationMinutes ?? (hasQuantity ? undefined : DEFAULT_DURATION_MINUTES_WHEN_UNSPECIFIED),
    steps,
    distanceKm,
    intensity,
    confidence,
  };
}
