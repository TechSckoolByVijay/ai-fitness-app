import { customRangeError, exportFilename, presetLabel } from './exportRange';

describe('customRangeError', () => {
  it('accepts a normal range', () => {
    expect(customRangeError('2026-09-01', '2026-09-30')).toBeNull();
  });

  it('asks for both dates', () => {
    expect(customRangeError('', '2026-09-30')).toMatch(/start and an end/);
  });

  it('rejects a backwards range and one over a year', () => {
    expect(customRangeError('2026-09-30', '2026-09-01')).toMatch(/after/);
    expect(customRangeError('2025-01-01', '2026-09-01')).toMatch(/at most/);
  });
});

describe('exportFilename', () => {
  it('names the file after what and when', () => {
    expect(exportFilename('food', { days: 30 })).toBe('fitness-food-log-last-30-days.csv');
    expect(exportFilename('days', { from: '2026-09-01', to: '2026-09-30' })).toBe(
      'fitness-daily-summary-2026-09-01-to-2026-09-30.csv',
    );
  });
});

describe('presetLabel', () => {
  it('reads a year as a year', () => {
    expect(presetLabel(365)).toBe('1 year');
    expect(presetLabel(7)).toBe('7 days');
  });
});
