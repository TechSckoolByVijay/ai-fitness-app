import { getContextualCoachPrompts } from './coachSuggestions';

function atHour(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

describe('getContextualCoachPrompts', () => {
  it('always returns at least three prompts', () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(getContextualCoachPrompts(atHour(hour)).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('suggests breakfast in the morning, never dinner', () => {
    const prompts = getContextualCoachPrompts(atHour(8)).join(' ').toLowerCase();
    expect(prompts).toContain('breakfast');
    expect(prompts).not.toContain('dinner');
  });

  it('suggests lunch around midday, never breakfast or dinner', () => {
    const prompts = getContextualCoachPrompts(atHour(13)).join(' ').toLowerCase();
    expect(prompts).toContain('lunch');
    expect(prompts).not.toContain('breakfast');
    expect(prompts).not.toContain('dinner');
  });

  it('suggests a snack in the late afternoon, not dinner (the "7pm tea" case, one hour earlier)', () => {
    const prompts = getContextualCoachPrompts(atHour(18)).join(' ').toLowerCase();
    expect(prompts).toContain('snack');
    expect(prompts).not.toContain('dinner');
  });

  it('suggests dinner in the evening, not a snack (never tea at 7pm)', () => {
    const prompts = getContextualCoachPrompts(atHour(19)).join(' ').toLowerCase();
    expect(prompts).toContain('dinner');
    expect(prompts).not.toContain('snack');
  });

  it('suggests something light late at night, never a full meal', () => {
    const prompts = getContextualCoachPrompts(atHour(23)).join(' ').toLowerCase();
    expect(prompts).not.toContain('breakfast');
    expect(prompts).not.toContain('lunch');
    expect(prompts).not.toContain('dinner');
  });
});
