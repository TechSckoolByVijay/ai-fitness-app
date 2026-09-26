export type CsvValue = string | number | boolean | null | undefined;

/**
 * Excel opens a BOM-less UTF-8 CSV as Windows-1252 and mangles anything
 * non-ASCII (a food name typed in Hindi, "½"). The BOM is harmless to every
 * other reader.
 */
const UTF8_BOM = '﻿';

/**
 * A spreadsheet treats a cell starting with one of these as a formula.
 * Food names and "what you said" are user text, so a leading one is
 * neutralised — otherwise a CSV export becomes a way to run formulas in
 * whoever opens it. Only text is touched: a negative number stays a number.
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function formatCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const text = FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180: comma-separated, CRLF line endings, quotes doubled. */
export function toCsv(headers: readonly string[], rows: readonly CsvValue[][]): string {
  const lines = [headers.map(formatCell).join(','), ...rows.map((row) => row.map(formatCell).join(','))];
  return UTF8_BOM + lines.join('\r\n') + '\r\n';
}
