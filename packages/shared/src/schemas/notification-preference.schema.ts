import { z } from 'zod';
import { NotificationCategorySchema } from './enums.schema';

export const NotificationPreferenceDtoSchema = z.object({
  category: NotificationCategorySchema,
  enabled: z.boolean(),
  preferredTime: z.string().nullable(),
});
export type NotificationPreferenceDto = z.infer<typeof NotificationPreferenceDtoSchema>;

export const NotificationPreferencesResponseSchema = z.object({
  preferences: z.array(NotificationPreferenceDtoSchema),
});
export type NotificationPreferencesResponse = z.infer<typeof NotificationPreferencesResponseSchema>;

export const UpdateNotificationPreferenceRequestSchema = z.object({
  category: NotificationCategorySchema,
  enabled: z.boolean(),
  /** "HH:MM" 24-hour local time, e.g. "21:30" — optional, only meaningful when enabled. */
  preferredTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
});
export type UpdateNotificationPreferenceRequest = z.infer<typeof UpdateNotificationPreferenceRequestSchema>;
