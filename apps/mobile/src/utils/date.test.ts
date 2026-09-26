import { localISOString } from './date';

describe('localISOString', () => {
  it('names the same instant as toISOString, in local wall-clock terms', () => {
    const now = new Date('2026-09-26T03:45:10Z');
    const local = localISOString(now);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(new Date(local).getTime()).toBe(now.getTime());
  });
});
