import { z } from 'zod';
import { NotificationCategorySchema } from './enums.schema';

/** "HH:MM" 24-hour local time, e.g. "21:30". */
export const ReminderTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM (24-hour)');

export const ReminderLabelSchema = z.string().trim().min(1).max(40);

export const NotificationPreferenceDtoSchema = z.object({
  /**
   * Every reminder is addressed by row id, not by category — a user can have
   * several reminders of the same category (two meal reminders, say), so the
   * category alone no longer identifies one.
   */
  id: z.string(),
  category: NotificationCategorySchema,
  /** null for the built-in reminders; the user's own wording for ones they added. */
  label: z.string().nullable(),
  /**
   * Built-ins can be disabled but never deleted, so a user cannot end up in a
   * state where the app has permanently lost its water reminder.
   */
  isBuiltIn: z.boolean(),
  enabled: z.boolean(),
  preferredTime: z.string().nullable(),
});
export type NotificationPreferenceDto = z.infer<typeof NotificationPreferenceDtoSchema>;

export const NotificationPreferencesResponseSchema = z.object({
  preferences: z.array(NotificationPreferenceDtoSchema),
});
export type NotificationPreferencesResponse = z.infer<typeof NotificationPreferencesResponseSchema>;

/** Partial update — omitted fields are left as they are. */
export const UpdateNotificationPreferenceRequestSchema = z.object({
  enabled: z.boolean().optional(),
  /** Explicit null clears the time (reminder stays but stops firing). */
  preferredTime: ReminderTimeSchema.nullable().optional(),
  label: ReminderLabelSchema.optional(),
});
export type UpdateNotificationPreferenceRequest = z.infer<typeof UpdateNotificationPreferenceRequestSchema>;

export const CreateNotificationPreferenceRequestSchema = z.object({
  category: NotificationCategorySchema,
  label: ReminderLabelSchema,
  preferredTime: ReminderTimeSchema,
  enabled: z.boolean().default(true),
});
export type CreateNotificationPreferenceRequest = z.infer<typeof CreateNotificationPreferenceRequestSchema>;
