import type { ExportKind } from '@fitness-app/shared';
import { apiRequest } from './client';

export type ExportRange = { days: number } | { from: string; to: string };

/** Fetches one export file as CSV text. */
export function fetchExportCsv(kind: ExportKind, range: ExportRange): Promise<string> {
  const query = new URLSearchParams();
  if ('days' in range) {
    query.set('days', String(range.days));
  } else {
    query.set('from', range.from);
    query.set('to', range.to);
  }
  // Used only when the profile has no zone on record yet.
  query.set('tz', Intl.DateTimeFormat().resolvedOptions().timeZone);
  return apiRequest<string>(`/export/${kind}.csv?${query.toString()}`, { responseType: 'text' });
}
