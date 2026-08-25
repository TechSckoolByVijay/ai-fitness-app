import { describe, expect, it } from 'vitest';
import {
  classifyItemConfidence,
  classifyMealConfidence,
  shouldAutoLog,
} from '../../src/modules/confidence';

describe('classifyItemConfidence', () => {
  it('classifies "I ate one banana" style confidence (0.9) as high', () => {
    expect(classifyItemConfidence(0.9)).toBe('high');
  });

  it('classifies exactly the high threshold (0.8) as high', () => {
    expect(classifyItemConfidence(0.8)).toBe('high');
  });

  it('classifies "a bowl of curry" style confidence (0.55) as medium', () => {
    expect(classifyItemConfidence(0.55)).toBe('medium');
  });

  it('classifies exactly the medium threshold (0.5) as medium', () => {
    expect(classifyItemConfidence(0.5)).toBe('medium');
  });

  it('classifies "some curry" style confidence (0.25) as low', () => {
    expect(classifyItemConfidence(0.25)).toBe('low');
  });

  it('classifies 0 as low', () => {
    expect(classifyItemConfidence(0)).toBe('low');
  });
});

describe('classifyMealConfidence', () => {
  it('returns high when every item is high', () => {
    expect(classifyMealConfidence(['high', 'high'])).toBe('high');
  });

  it('returns the worst tier across items (one medium drags down two highs)', () => {
    expect(classifyMealConfidence(['high', 'medium', 'high'])).toBe('medium');
  });

  it('returns low if any single item is low, even among highs', () => {
    expect(classifyMealConfidence(['high', 'high', 'low'])).toBe('low');
  });

  it('returns low for an empty item list', () => {
    expect(classifyMealConfidence([])).toBe('low');
  });
});

describe('shouldAutoLog', () => {
  it('auto-logs only when tier is high AND the setting is enabled', () => {
    expect(shouldAutoLog('high', true)).toBe(true);
  });

  it('never auto-logs when the setting is disabled, even at high confidence', () => {
    expect(shouldAutoLog('high', false)).toBe(false);
  });

  it('never auto-logs medium or low confidence regardless of setting', () => {
    expect(shouldAutoLog('medium', true)).toBe(false);
    expect(shouldAutoLog('low', true)).toBe(false);
  });
});
