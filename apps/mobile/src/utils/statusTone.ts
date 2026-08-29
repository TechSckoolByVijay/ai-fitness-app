import { classifyCalorieAlignment, type GoalType } from '@fitness-app/shared';

/**
 * Visual severity for any status surface in the app.
 *
 * This exists because the app previously rendered *every* status message in
 * brand green — a warning and a compliment were pixel-identical. Colour is
 * the signal here, so it gets one definition rather than per-screen ad-hoc
 * Tailwind classes.
 *
 * Note the deliberate split between `positive` and `neutral`: the brand
 * colour IS green, so if the default/resting state is also green then green
 * stops carrying meaning. `neutral` is therefore a slate surface, and green
 * is reserved for "this is actually going well".
 */
export type StatusTone = 'positive' | 'neutral' | 'caution' | 'critical';

export interface ToneStyle {
  /** Solid tinted surface — for hero cards. */
  heroContainer: string;
  /** Progress-bar fill on a hero surface. */
  heroBar: string;
  heroTrack: string;
  heroMarker: string;
  /** Soft tinted surface + readable text — for inline cards/banners. */
  softContainer: string;
  softText: string;
  /**
   * Never rely on colour alone — roughly 1 in 12 men have a red/green colour
   * vision deficiency, which is exactly the distinction being drawn here.
   * Every tone carries a glyph and a word as well.
   *
   * The glyphs are chosen to be unambiguous at a glance and distinct in
   * *shape*, not just colour: tick / dot / triangle / cross.
   */
  icon: string;
  label: string;
  /** Glyph colour on a soft (untinted-text) surface. */
  softIcon: string;
}

/**
 * Class strings are written out in full (no template interpolation) because
 * NativeWind resolves Tailwind classes statically at build time — a
 * dynamically assembled class name silently renders as no style at all.
 */
export const TONE_STYLES: Record<StatusTone, ToneStyle> = {
  positive: {
    heroContainer: 'bg-primary-500 shadow-primary-500/30',
    heroBar: 'bg-white',
    heroTrack: 'bg-white/25',
    heroMarker: 'bg-primary-900/60',
    softContainer: 'bg-primary-50 dark:bg-primary-900/30',
    softText: 'text-primary-800 dark:text-primary-200',
    icon: '✓',
    label: 'On track',
    softIcon: 'text-primary-600 dark:text-primary-400',
  },
  neutral: {
    heroContainer: 'bg-slate-700 shadow-slate-700/30',
    heroBar: 'bg-white',
    heroTrack: 'bg-white/25',
    heroMarker: 'bg-slate-950/60',
    softContainer: 'bg-white dark:bg-muted-dark',
    softText: 'text-gray-700 dark:text-gray-200',
    icon: '•',
    label: 'Tracking',
    softIcon: 'text-gray-500 dark:text-gray-400',
  },
  caution: {
    heroContainer: 'bg-caution-500 shadow-caution-500/30',
    heroBar: 'bg-white',
    heroTrack: 'bg-white/25',
    heroMarker: 'bg-caution-900/60',
    softContainer: 'bg-caution-50 dark:bg-caution-900/30',
    softText: 'text-caution-800 dark:text-caution-200',
    icon: '⚠',
    label: 'Heads up',
    softIcon: 'text-caution-600 dark:text-caution-400',
  },
  critical: {
    heroContainer: 'bg-danger-600 shadow-danger-600/30',
    heroBar: 'bg-white',
    heroTrack: 'bg-white/25',
    heroMarker: 'bg-danger-950/60',
    softContainer: 'bg-danger-50 dark:bg-danger-900/30',
    softText: 'text-danger-800 dark:text-danger-200',
    icon: '✕',
    label: 'Over budget',
    softIcon: 'text-danger-600 dark:text-danger-400',
  },
};

/**
 * Severity for today's calorie intake.
 *
 * Two distinct questions get asked here, and the stronger answer wins:
 *
 * 1. Has the user blown through the *whole day's* budget? That's a real
 *    warning no matter what time it is, so it outranks pace.
 * 2. If not, are they drifting off the pace they'd normally be at by now?
 *    That's goal-aware (`classifyCalorieAlignment`) — eating above pace is
 *    unfavourable when losing weight and favourable when gaining.
 *
 * Deliberately conservative: this reports what the numbers say and stops
 * short of anything that reads as medical judgement (see PRODUCT.md
 * principle 7 and the Play Store health-review notes in PLAN.md).
 */
export function getCalorieStatusTone(
  goalType: GoalType | null,
  caloriesConsumed: number,
  calorieTarget: number | null,
  expectedByNow: number,
): StatusTone {
  if (!calorieTarget || calorieTarget <= 0) return 'neutral';

  // Over the full day's budget — the unambiguous warning case.
  if (caloriesConsumed > calorieTarget) return 'critical';

  // Nothing expected yet (before the eating window opens) is not a signal.
  if (expectedByNow <= 0) return 'neutral';

  const alignment = classifyCalorieAlignment(goalType, caloriesConsumed, expectedByNow);
  if (alignment === 'unfavorable') return 'caution';
  if (alignment === 'favorable') return 'positive';
  return 'neutral';
}
