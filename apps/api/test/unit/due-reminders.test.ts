import { describe, expect, it } from 'vitest';
import { isReminderDue, localClock, parseTimeToMinutes } from '../../src/modules/notifications/due-reminders';

const base = { enabled: true, preferredTime: '21:00', lastSentOn: null, timeZone: 'Asia/Kolkata' };

/** 21:00 IST is 15:30 UTC. */
const AT_9PM_IST = new Date('2026-08-29T15:30:00Z');

describe('localClock', () => {
  it('reports the wall-clock time in the given zone', () => {
    expect(localClock(AT_9PM_IST, 'Asia/Kolkata')).toEqual({ date: '2026-08-29', minutes: 21 * 60 });
    expect(localClock(AT_9PM_IST, 'UTC')).toEqual({ date: '2026-08-29', minutes: 15 * 60 + 30 });
  });

  it('rolls the local date over independently of UTC', () => {
    // 19:00 UTC is already the next day in Kolkata (00:30).
    const late = new Date('2026-08-29T19:00:00Z');
    expect(localClock(late, 'Asia/Kolkata').date).toBe('2026-08-30');
    expect(localClock(late, 'UTC').date).toBe('2026-08-29');
  });

  it('handles a DST zone on both sides of the transition', () => {
    // US Eastern: 2026-03-08 is the spring-forward date.
    expect(localClock(new Date('2026-03-08T06:30:00Z'), 'America/New_York').minutes).toBe(60 + 30); // EST, 01:30
    expect(localClock(new Date('2026-03-08T07:30:00Z'), 'America/New_York').minutes).toBe(3 * 60 + 30); // EDT, 03:30
  });

  it('falls back to UTC for a malformed zone instead of throwing', () => {
    // One bad value from an old client must not take down the whole tick.
    expect(localClock(AT_9PM_IST, 'Not/AZone')).toEqual(localClock(AT_9PM_IST, 'UTC'));
  });

  it('treats a missing zone as UTC', () => {
    expect(localClock(AT_9PM_IST, null)).toEqual(localClock(AT_9PM_IST, 'UTC'));
  });
});

describe('parseTimeToMinutes', () => {
  it('parses valid times and rejects everything else', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('21:30')).toBe(21 * 60 + 30);
    expect(parseTimeToMinutes('9:30')).toBeNull();
    expect(parseTimeToMinutes('24:00')).toBeNull();
    expect(parseTimeToMinutes(null)).toBeNull();
  });
});

describe('isReminderDue', () => {
  it('fires at the target minute in the user local zone', () => {
    expect(isReminderDue(base, AT_9PM_IST)).toBe(true);
  });

  it('does not fire early', () => {
    const oneMinuteBefore = new Date('2026-08-29T15:29:00Z');
    expect(isReminderDue(base, oneMinuteBefore)).toBe(false);
  });

  it('catches up within the grace window if a tick was missed', () => {
    // The scheduler can be delayed by a slow tick or a deploy; without this
    // a reminder whose exact minute was missed would never fire that day.
    const fourMinutesLate = new Date('2026-08-29T15:34:00Z');
    expect(isReminderDue(base, fourMinutesLate)).toBe(true);
  });

  it('gives up rather than delivering a missed reminder hours later', () => {
    const twoHoursLate = new Date('2026-08-29T17:30:00Z');
    expect(isReminderDue(base, twoHoursLate)).toBe(false);
  });

  it('fires only once per local day', () => {
    expect(isReminderDue({ ...base, lastSentOn: '2026-08-29' }, AT_9PM_IST)).toBe(false);
    // The next local day is fair game again.
    expect(isReminderDue({ ...base, lastSentOn: '2026-08-28' }, AT_9PM_IST)).toBe(true);
  });

  it('ignores disabled reminders and ones with no time set', () => {
    expect(isReminderDue({ ...base, enabled: false }, AT_9PM_IST)).toBe(false);
    expect(isReminderDue({ ...base, preferredTime: null }, AT_9PM_IST)).toBe(false);
  });

  it('does not fire a Kolkata user on the server local clock', () => {
    // The whole point of storing a timezone: 21:00 UTC is 02:30 next day in
    // Kolkata, so this must NOT be due for an Asia/Kolkata user.
    const nineUtc = new Date('2026-08-29T21:00:00Z');
    expect(isReminderDue(base, nineUtc)).toBe(false);
    expect(isReminderDue({ ...base, timeZone: 'UTC' }, nineUtc)).toBe(true);
  });
});
