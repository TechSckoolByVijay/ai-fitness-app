import { EXPORT_MAX_DAYS, type ExportQuery } from '@fitness-app/shared';
import { ValidationError } from '../../lib/errors';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Falls back to UTC for a missing or unrecognised zone rather than failing the export. */
export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/** The user's calendar date for an instant, as YYYY-MM-DD. */
export function localDate(instant: Date, timeZone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** The user's wall-clock time for an instant, as 24-hour HH:mm. */
export function localTime(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Every date from `from` to `to` inclusive. */
export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  return dates;
}

export interface DateRange {
  from: string;
  to: string;
  /**
   * A UTC window guaranteed to contain every instant whose local date is in
   * [from, to] for any zone (offsets run from -12h to +14h). Rows are
   * fetched with this, then filtered by their exact local date.
   */
  queryStart: Date;
  queryEnd: Date;
}

export function resolveRange(query: ExportQuery, timeZone: string, now: Date = new Date()): DateRange {
  const today = localDate(now, timeZone);
  let from: string;
  let to: string;
  if (query.days !== undefined) {
    to = today;
    from = addDays(today, -(query.days - 1));
  } else {
    from = query.from!;
    to = query.to ?? today;
  }

  if (Number.isNaN(Date.parse(`${from}T00:00:00Z`)) || Number.isNaN(Date.parse(`${to}T00:00:00Z`))) {
    throw new ValidationError('Not a real date');
  }
  if (from > to) throw new ValidationError('from must be on or before to');
  if (eachDateCount(from, to) > EXPORT_MAX_DAYS) {
    throw new ValidationError(`At most ${EXPORT_MAX_DAYS} days per export`);
  }

  return {
    from,
    to,
    queryStart: new Date(Date.parse(`${from}T00:00:00Z`) - DAY_MS),
    queryEnd: new Date(Date.parse(`${to}T00:00:00Z`) + 2 * DAY_MS),
  };
}

function eachDateCount(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}
