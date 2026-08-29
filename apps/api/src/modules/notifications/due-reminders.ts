/**
 * Deciding when a reminder is due.
 *
 * A reminder time is local wall-clock ("21:00" means nine in the evening
 * where the user is), so every decision here has to happen in the user's own
 * timezone. Kept pure and separate from the sender because this is the part
 * that is easy to get subtly wrong — an off-by-one-hour bug around a DST
 * boundary is invisible until someone gets a bedtime nudge at lunchtime.
 */

export interface LocalClock {
  /** "YYYY-MM-DD" in the user's zone. */
  date: string;
  /** Minutes since local midnight. */
  minutes: number;
}

/** Fallback when a user has no timezone recorded yet — UTC, rather than the server's incidental locale. */
export const DEFAULT_TIME_ZONE = 'UTC';

/**
 * The wall-clock date and time in `timeZone` at instant `now`.
 *
 * Uses Intl rather than manual offset arithmetic so DST transitions are
 * handled by the platform's tz database instead of by us.
 */
export function localClock(now: Date, timeZone: string | null): LocalClock {
  const zone = timeZone || DEFAULT_TIME_ZONE;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    // A malformed zone from an old client must not take the scheduler down
    // for every other user; fall back rather than throw.
    return localClock(now, DEFAULT_TIME_ZONE);
  }

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** "HH:MM" to minutes since midnight, or null if unparseable. */
export function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export interface DueInput {
  enabled: boolean;
  preferredTime: string | null;
  /** The local date this reminder last fired on. */
  lastSentOn: string | null;
  timeZone: string | null;
}

/**
 * Whether a reminder should fire on this tick.
 *
 * `graceMinutes` deliberately looks *backwards* from now: the scheduler
 * ticks on a timer that can drift, be delayed by a slow tick, or miss a
 * minute entirely during a deploy. Without a window, a reminder whose exact
 * minute was missed would silently never fire that day. It never looks
 * forward — a reminder must not arrive early.
 *
 * Firing at most once per local date is what makes the window safe: a
 * reminder inside the grace window still only sends once.
 */
export function isReminderDue(input: DueInput, now: Date, graceMinutes = 5): boolean {
  if (!input.enabled) return false;

  const target = parseTimeToMinutes(input.preferredTime);
  if (target === null) return false;

  const clock = localClock(now, input.timeZone);
  if (clock.date === input.lastSentOn) return false;

  const delta = clock.minutes - target;
  // Only same-day catch-up. A reminder missed entirely (e.g. the app was
  // down all evening) is skipped rather than delivered at breakfast.
  return delta >= 0 && delta <= graceMinutes;
}
