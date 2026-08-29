import { z } from 'zod';
import {
  ActivityLevelSchema,
  AllergyTypeSchema,
  DietTypeSchema,
  GoalTypeSchema,
  HealthConditionTypeSchema,
  SexSchema,
} from './enums.schema';
import { UnitSystemSchema } from './units.schema';

export const UpdateProfileRequestSchema = z.object({
  dateOfBirth: z.string().optional(),
  sex: SexSchema.optional(),
  heightCm: z.number().positive().optional(),
  currentWeightKg: z.number().positive().optional(),
  targetWeightKg: z.number().positive().optional(),
  activityLevel: ActivityLevelSchema.optional(),
  /** Display preference only — heightCm/weightKg above are always metric. */
  unitSystem: UnitSystemSchema.optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const UpdateGoalsRequestSchema = z.object({
  primaryGoal: GoalTypeSchema,
  secondaryGoals: z.array(GoalTypeSchema).optional(),
});
export type UpdateGoalsRequest = z.infer<typeof UpdateGoalsRequestSchema>;

export const UpdateDietRequestSchema = z.object({
  dietType: DietTypeSchema,
  otherText: z.string().optional(),
});
export type UpdateDietRequest = z.infer<typeof UpdateDietRequestSchema>;

export const UpdateAllergiesRequestSchema = z.object({
  allergies: z.array(
    z.object({ type: AllergyTypeSchema, otherText: z.string().optional() }),
  ),
});
export type UpdateAllergiesRequest = z.infer<typeof UpdateAllergiesRequestSchema>;

export const UpdateHealthConditionsRequestSchema = z.object({
  conditions: z.array(
    z.object({ type: HealthConditionTypeSchema, otherText: z.string().optional() }),
  ),
  skipped: z.boolean().optional(),
});
export type UpdateHealthConditionsRequest = z.infer<typeof UpdateHealthConditionsRequestSchema>;

export const GoalDtoSchema = z.object({
  type: GoalTypeSchema,
  isPrimary: z.boolean(),
});
export type GoalDto = z.infer<typeof GoalDtoSchema>;

export const ProfileDtoSchema = z.object({
  dateOfBirth: z.string().nullable(),
  sex: SexSchema.nullable(),
  heightCm: z.number().nullable(),
  currentWeightKg: z.number().nullable(),
  targetWeightKg: z.number().nullable(),
  activityLevel: ActivityLevelSchema.nullable(),
  unitSystem: UnitSystemSchema,
  waterTargetMl: z.number().nullable(),
  calorieTarget: z.number().nullable(),
  proteinTarget: z.number().nullable(),
  onboardingCompletedAt: z.string().nullable(),
});
export type ProfileDto = z.infer<typeof ProfileDtoSchema>;

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  profilePhotoUrl: z.string().nullable(),
  profile: ProfileDtoSchema,
  goals: z.array(GoalDtoSchema),
  dietPreference: z
    .object({ dietType: DietTypeSchema, otherText: z.string().nullable() })
    .nullable(),
  allergies: z.array(z.object({ type: AllergyTypeSchema, otherText: z.string().nullable() })),
  healthConditions: z.array(
    z.object({ type: HealthConditionTypeSchema, otherText: z.string().nullable() }),
  ),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const DeleteAccountRequestSchema = z.object({
  password: z.string().optional(),
});
export type DeleteAccountRequest = z.infer<typeof DeleteAccountRequestSchema>;
