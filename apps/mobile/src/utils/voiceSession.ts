/**
 * Decides whether a speech session that just ended on its own should be
 * restarted. Android's recogniser ends a session after a second or two of
 * silence (and ignores `continuous` below Android 13), but people pause to
 * remember what they ate — only the user tapping Done should end listening.
 */

/** Long enough to describe a whole day; short enough that a forgotten mic doesn't run forever. */
export const MAX_LISTEN_MS = 3 * 60 * 1000;

/**
 * A recogniser that ends immediately every time it starts (busy engine, no
 * audio) would otherwise restart in a tight loop. This many ends inside the
 * window means it isn't a pause — give up and let the user type instead.
 */
export const RAPID_END_LIMIT = 4;
export const RAPID_END_WINDOW_MS = 3000;

/** Errors that just mean "you went quiet" — the session ends and we carry on. */
const PAUSE_ERRORS = new Set(['no-speech', 'speech-timeout']);

export function isPauseError(code: string): boolean {
  return PAUSE_ERRORS.has(code);
}

export interface ResumeInput {
  /** The user has not tapped Done/Cancel and no fatal error occurred. */
  wantListening: boolean;
  startedAt: number;
  now: number;
  /** Timestamps of recent session ends, oldest first. */
  recentEnds: number[];
}

export function shouldResumeListening({ wantListening, startedAt, now, recentEnds }: ResumeInput): boolean {
  if (!wantListening) return false;
  if (now - startedAt >= MAX_LISTEN_MS) return false;
  const rapid = recentEnds.filter((t) => now - t <= RAPID_END_WINDOW_MS);
  return rapid.length < RAPID_END_LIMIT;
}
