import { z } from 'zod';

/** A day's worth of metrics read from the device's health store. */
export const HealthDaySchema = z.object({
  /** "YYYY-MM-DD" in the user's local time. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().min(0).max(300_000).nullable().optional(),
  distanceMeters: z.number().min(0).max(1_000_000).nullable().optional(),
  activeCalories: z.number().min(0).max(30_000).nullable().optional(),
  sleepMinutes: z.number().int().min(0).max(24 * 60).nullable().optional(),
  restingHeartRate: z.number().int().min(20).max(250).nullable().optional(),
});
export type HealthDay = z.infer<typeof HealthDaySchema>;

/** Devices are synced in batches — a week of catch-up after reconnecting is normal. */
export const SyncHealthDataRequestSchema = z.object({
  provider: z.enum(['health_connect', 'apple_health']),
  days: z.array(HealthDaySchema).min(1).max(31),
});
export type SyncHealthDataRequest = z.infer<typeof SyncHealthDataRequestSchema>;

export const HealthConnectionDtoSchema = z.object({
  provider: z.enum(['health_connect', 'apple_health']),
  status: z.enum(['connected', 'disconnected', 'error']),
  connectedAt: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
});
export type HealthConnectionDto = z.infer<typeof HealthConnectionDtoSchema>;

export const HealthConnectionResponseSchema = z.object({
  connections: z.array(HealthConnectionDtoSchema),
});
export type HealthConnectionResponse = z.infer<typeof HealthConnectionResponseSchema>;

/**
 * A conventional default rather than a per-user setting — the app does not
 * ask for a step goal, and inventing a personalised one from body data would
 * imply a precision this has no basis for.
 */
export const DEFAULT_STEPS_TARGET = 10_000;
