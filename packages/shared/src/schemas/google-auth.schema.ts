import { z } from 'zod';

export const GoogleAuthRequestSchema = z.object({
  /**
   * The Google ID token from the native sign-in flow.
   *
   * Deliberately the ID token rather than an access token or a raw profile:
   * it is a JWT signed by Google, so the server can verify who issued it and
   * which app it was issued to. Anything the client merely *asserts* about
   * the user (email, name, id) is unverifiable and must never be trusted.
   */
  idToken: z.string().min(1),
});
export type GoogleAuthRequest = z.infer<typeof GoogleAuthRequestSchema>;
