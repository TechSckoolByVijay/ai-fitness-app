import { EXPORT_MAX_DAYS, type ExportKind } from '@fitness-app/shared';
import type { ExportRange } from '../api/export.api';

export const PRESET_DAYS = [7, 30, 90, 365] as const;

export function presetLabel(days: number): string {
  return days === 365 ? '1 year' : `${days} days`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

/** Why a custom range can't be exported yet, or null when it can. Mirrors the server's own checks. */
export function customRangeError(from: string, to: string): string | null {
  if (!from || !to) return 'Pick a start and an end date.';
  if (from > to) return 'The start date is after the end date.';
  if (daysBetween(from, to) > EXPORT_MAX_DAYS) return `Pick at most ${EXPORT_MAX_DAYS} days.`;
  return null;
}

export function exportFilename(kind: ExportKind, range: ExportRange): string {
  const what = kind === 'food' ? 'food-log' : 'daily-summary';
  const when = 'days' in range ? `last-${range.days}-days` : `${range.from}-to-${range.to}`;
  return `fitness-${what}-${when}.csv`;
}
