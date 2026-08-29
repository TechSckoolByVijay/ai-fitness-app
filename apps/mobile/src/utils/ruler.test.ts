import { indexToOffset, indexToValue, isMajorTick, offsetToIndex, tickCount, valueToIndex } from './ruler';

const KG = { min: 30, max: 250, step: 0.1 };
const LB = { min: 66, max: 550, step: 1 };

describe('ruler geometry', () => {
  it('counts ticks inclusively at both ends', () => {
    expect(tickCount({ min: 0, max: 10, step: 1 })).toBe(11);
    expect(tickCount(KG)).toBe(2201);
  });

  it('does not accumulate floating-point dust across steps', () => {
    // Naive min + index * 0.1 gives 30.300000000000004 here.
    expect(indexToValue(3, KG)).toBe(30.3);
    expect(indexToValue(705, KG)).toBe(100.5);
    // Every value across a sweep stays at one decimal place.
    for (let i = 0; i < 200; i++) {
      expect(String(indexToValue(i, KG))).toMatch(/^\d+(\.\d)?$/);
    }
  });

  it('round-trips value to index and back', () => {
    for (const value of [30, 70.5, 90.2, 249.9]) {
      expect(indexToValue(valueToIndex(value, KG), KG)).toBeCloseTo(value, 5);
    }
  });

  it('clamps a value from outside the range instead of scrolling to nowhere', () => {
    // An old entry or a unit switch can hand us something out of bounds.
    expect(valueToIndex(5, KG)).toBe(0);
    expect(valueToIndex(9999, KG)).toBe(tickCount(KG) - 1);
  });

  it('round-trips index to scroll offset and back', () => {
    const tickWidth = 12;
    for (const index of [0, 1, 500, 2200]) {
      expect(offsetToIndex(indexToOffset(index, tickWidth), tickWidth, KG)).toBe(index);
    }
  });

  it('snaps a scroll offset landing between ticks to the nearest one', () => {
    expect(offsetToIndex(17, 12, KG)).toBe(1); // 1.41 ticks -> 1
    expect(offsetToIndex(19, 12, KG)).toBe(2); // 1.58 ticks -> 2
  });

  it('never returns an out-of-range index for an overscrolled offset', () => {
    expect(offsetToIndex(-500, 12, KG)).toBe(0);
    expect(offsetToIndex(999999, 12, KG)).toBe(tickCount(KG) - 1);
  });

  it('labels every tenth tick', () => {
    expect(isMajorTick(0)).toBe(true);
    expect(isMajorTick(10)).toBe(true);
    expect(isMajorTick(5)).toBe(false);
  });

  it('works for a whole-number imperial scale too', () => {
    expect(indexToValue(0, LB)).toBe(66);
    expect(indexToValue(133, LB)).toBe(199);
    expect(valueToIndex(199, LB)).toBe(133);
  });
});
