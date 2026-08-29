/**
 * Geometry for the horizontal ruler picker.
 *
 * Kept separate from the component because this is the part that can be
 * wrong in ways a screenshot will not reveal: an off-by-one in the
 * index/value mapping silently logs the wrong weight.
 */

export interface RulerConfig {
  min: number;
  max: number;
  /** Distance between adjacent ticks, in value units. */
  step: number;
}

/** Rounds away floating-point dust from repeated step addition (0.1 * 3 = 0.30000000000000004). */
function quantize(value: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(value.toFixed(decimals));
}

export function tickCount({ min, max, step }: RulerConfig): number {
  return Math.floor(quantize((max - min) / step, 0.0001)) + 1;
}

export function indexToValue(index: number, { min, step }: RulerConfig): number {
  return quantize(min + index * step, step);
}

/**
 * Nearest tick index for a value, clamped into range — a stored weight can
 * sit outside the picker's bounds (an old entry, or a unit switch), and the
 * ruler must still open somewhere sensible rather than scrolling to nowhere.
 */
export function valueToIndex(value: number, config: RulerConfig): number {
  const raw = Math.round((value - config.min) / config.step);
  return Math.min(tickCount(config) - 1, Math.max(0, raw));
}

/** Scroll offset in px for a tick index. */
export function indexToOffset(index: number, tickWidth: number): number {
  return index * tickWidth;
}

/** Tick index for a scroll offset, snapped to the nearest tick. */
export function offsetToIndex(offset: number, tickWidth: number, config: RulerConfig): number {
  const raw = Math.round(offset / tickWidth);
  return Math.min(tickCount(config) - 1, Math.max(0, raw));
}

/**
 * Whether a tick gets a number printed under it. Every 10th step keeps the
 * scale readable without crowding — at a 0.1 step that is a label per whole
 * unit, which is how people actually read a weight.
 */
export function isMajorTick(index: number): boolean {
  return index % 10 === 0;
}
