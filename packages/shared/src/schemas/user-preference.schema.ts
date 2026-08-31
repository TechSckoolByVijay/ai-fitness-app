import { z } from 'zod';

export const UserPreferenceKindSchema = z.enum(['unit_weight', 'activity_intensity']);
export type UserPreferenceKind = z.infer<typeof UserPreferenceKindSchema>;

/**
 * Bounds exist so a typo cannot quietly poison every future calculation.
 * A "scoop" of 5000g would silently wreck the day's total the way the 20kg
 * curd did — a preference is more dangerous than a one-off entry, because it
 * keeps being applied.
 */
export const MIN_UNIT_GRAMS = 1;
export const MAX_UNIT_GRAMS = 2000;

/** Half the standard burn to double it — beyond that, the number stops being credible. */
export const MIN_INTENSITY_MULTIPLIER = 0.5;
export const MAX_INTENSITY_MULTIPLIER = 2;

export const UnitWeightPreferenceSchema = z.object({
  kind: z.literal('unit_weight'),
  /** The unit word as the user says it — "scoop", "bowl", "katori". */
  key: z.string().trim().min(1).max(40),
  grams: z.number().min(MIN_UNIT_GRAMS).max(MAX_UNIT_GRAMS),
});

export const ActivityIntensityPreferenceSchema = z.object({
  kind: z.literal('activity_intensity'),
  /** An ActivityType, or "default" to apply to everything. */
  key: z.string().trim().min(1).max(40),
  multiplier: z.number().min(MIN_INTENSITY_MULTIPLIER).max(MAX_INTENSITY_MULTIPLIER),
});

export const UpsertUserPreferenceRequestSchema = z.discriminatedUnion('kind', [
  UnitWeightPreferenceSchema,
  ActivityIntensityPreferenceSchema,
]);
export type UpsertUserPreferenceRequest = z.infer<typeof UpsertUserPreferenceRequestSchema>;

export const UserPreferenceDtoSchema = z.object({
  id: z.string(),
  kind: UserPreferenceKindSchema,
  key: z.string(),
  /** Present for unit_weight. */
  grams: z.number().nullable(),
  /** Present for activity_intensity. */
  multiplier: z.number().nullable(),
});
export type UserPreferenceDto = z.infer<typeof UserPreferenceDtoSchema>;

export const UserPreferencesResponseSchema = z.object({
  preferences: z.array(UserPreferenceDtoSchema),
});
export type UserPreferencesResponse = z.infer<typeof UserPreferencesResponseSchema>;
