import { describe, expect, it } from 'vitest';
import { computeSleepDurationMinutes } from '../../src/modules/sleep/sleep-duration';

describe('computeSleepDurationMinutes', () => {
  it('computes whole minutes between sleptAt and wokeAt', () => {
    const sleptAt = new Date('2026-08-25T22:30:00.000Z');
    const wokeAt = new Date('2026-08-26T06:30:00.000Z');
    expect(computeSleepDurationMinutes(sleptAt, wokeAt)).toBe(480);
  });

  it('rounds to the nearest whole minute', () => {
    const sleptAt = new Date('2026-08-25T22:30:00.000Z');
    const wokeAt = new Date('2026-08-25T22:30:30.400Z');
    expect(computeSleepDurationMinutes(sleptAt, wokeAt)).toBe(1);
  });

  it('returns a negative value when wokeAt precedes sleptAt (caller is responsible for rejecting this)', () => {
    const sleptAt = new Date('2026-08-25T06:00:00.000Z');
    const wokeAt = new Date('2026-08-25T05:00:00.000Z');
    expect(computeSleepDurationMinutes(sleptAt, wokeAt)).toBe(-60);
  });
});
