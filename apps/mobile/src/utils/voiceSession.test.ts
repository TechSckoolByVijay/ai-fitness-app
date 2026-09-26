import { MAX_LISTEN_MS, RAPID_END_LIMIT, isPauseError, shouldResumeListening } from './voiceSession';

describe('shouldResumeListening', () => {
  const base = { wantListening: true, startedAt: 0, now: 10_000, recentEnds: [] as number[] };

  it('keeps listening through a pause the user did not end', () => {
    expect(shouldResumeListening(base)).toBe(true);
  });

  it('stops once the user has tapped Done', () => {
    expect(shouldResumeListening({ ...base, wantListening: false })).toBe(false);
  });

  it('stops at the time cap', () => {
    expect(shouldResumeListening({ ...base, now: MAX_LISTEN_MS })).toBe(false);
  });

  it('gives up on a recogniser that ends as soon as it starts', () => {
    const recentEnds = Array.from({ length: RAPID_END_LIMIT }, (_, i) => 9_000 + i * 100);
    expect(shouldResumeListening({ ...base, recentEnds })).toBe(false);
  });

  it('does not count old ends against the user', () => {
    const recentEnds = Array.from({ length: RAPID_END_LIMIT }, (_, i) => 1_000 + i * 100);
    expect(shouldResumeListening({ ...base, recentEnds })).toBe(true);
  });
});

describe('isPauseError', () => {
  it('treats silence as a pause and permission as fatal', () => {
    expect(isPauseError('no-speech')).toBe(true);
    expect(isPauseError('speech-timeout')).toBe(true);
    expect(isPauseError('not-allowed')).toBe(false);
  });
});
