import { z } from 'zod';

export const RegisterPushTokenRequestSchema = z.object({
  /** Expo push token, e.g. "ExponentPushToken[xxxxxxxx]". */
  token: z.string().min(1).max(255),
  platform: z.enum(['ios', 'android', 'web']).optional(),
  /**
   * IANA timezone from the device. Sent with the token because a reminder
   * time is local wall-clock — the server cannot fire "21:00" without it.
   */
  timeZone: z.string().min(1).max(64).optional(),
});
export type RegisterPushTokenRequest = z.infer<typeof RegisterPushTokenRequestSchema>;
