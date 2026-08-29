/**
 * Unit conversion for display.
 *
 * Everything is STORED in metric — kilograms and centimetres — everywhere:
 * the database, the API contract, and every calculation (BMR/TDEE, BMI,
 * calorie targets). Imperial exists only at the edge, where a value is shown
 * to or entered by the user.
 *
 * Keeping one canonical unit underneath is what stops a whole class of bug:
 * a stored number is never ambiguous, historical rows never need
 * reinterpreting when someone flips the setting, and the target maths has
 * exactly one code path.
 */

export type UnitSystem = 'metric' | 'imperial';

/** Exact by definition — the international pound is defined as 0.45359237 kg. */
const KG_PER_LB = 0.45359237;
/** Exact by definition — the international inch is defined as 2.54 cm. */
const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export interface FeetInches {
  feet: number;
  inches: number;
}

/**
 * Splits a height into feet and inches for display.
 *
 * Rounds to the nearest inch first, then carries — otherwise a height that
 * rounds up to 12 inches renders as the nonsensical 5'12" instead of 6'0".
 */
export function cmToFeetInches(cm: number): FeetInches {
  const totalInches = Math.round(cmToInches(cm));
  return {
    feet: Math.floor(totalInches / INCHES_PER_FOOT),
    inches: totalInches % INCHES_PER_FOOT,
  };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feet * INCHES_PER_FOOT + inches);
}

/** Unit suffixes for the current system, for labelling inputs and readouts. */
export const UNIT_LABELS: Record<UnitSystem, { weight: string; height: string }> = {
  metric: { weight: 'kg', height: 'cm' },
  imperial: { weight: 'lb', height: 'ft/in' },
};

/**
 * A stored weight in kg, rendered for the user's chosen system.
 *
 * One decimal place in metric (bathroom scales resolve to ~100g), whole
 * pounds in imperial — a pound is already finer than 0.5 kg, so a decimal
 * there is false precision.
 */
export function formatWeight(kg: number, system: UnitSystem): string {
  if (system === 'imperial') {
    return `${Math.round(kgToLb(kg))} lb`;
  }
  return `${round1(kg)} kg`;
}

/** A stored height in cm, rendered for the user's chosen system. */
export function formatHeight(cm: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const { feet, inches } = cmToFeetInches(cm);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}

/**
 * Converts a stored kg value into the number the user should see in an input
 * for their system — the inverse of `weightInputToKg`.
 */
export function kgToDisplayWeight(kg: number, system: UnitSystem): number {
  return system === 'imperial' ? Math.round(kgToLb(kg)) : round1(kg);
}

/** Converts a number the user typed or picked, in their system, back to kg. */
export function weightInputToKg(value: number, system: UnitSystem): number {
  return system === 'imperial' ? lbToKg(value) : value;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
