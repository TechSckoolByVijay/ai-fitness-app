import { summarizeTrend } from './trend';

describe('summarizeTrend', () => {
  it('reports flat for short series', () => {
    expect(summarizeTrend([100, 200, 300]).direction).toBe('flat');
  });

  it('reports up when the second half is meaningfully higher', () => {
    const result = summarizeTrend([100, 100, 100, 100, 200, 200, 200, 200]);
    expect(result.direction).toBe('up');
    expect(result.changePct).toBeGreaterThan(5);
  });

  it('reports down when the second half is meaningfully lower', () => {
    const result = summarizeTrend([200, 200, 200, 200, 100, 100, 100, 100]);
    expect(result.direction).toBe('down');
  });

  it('reports flat for a stable series', () => {
    const result = summarizeTrend([150, 150, 150, 150, 152, 148, 151, 149]);
    expect(result.direction).toBe('flat');
  });

  it('handles an all-zero series without dividing by zero', () => {
    const result = summarizeTrend([0, 0, 0, 0, 0, 0]);
    expect(result.direction).toBe('flat');
    expect(Number.isFinite(result.changePct)).toBe(true);
  });

  it('computes the plain average correctly', () => {
    expect(summarizeTrend([10, 20, 30]).average).toBe(20);
  });
});
