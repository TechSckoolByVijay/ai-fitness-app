import type { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import type { Env } from '../../config/env';
import { UnauthorizedError } from '../../lib/errors';
import { seedBuiltInReminders } from '../notifications/notification-preferences.service';

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string | null;
  picture: string | null;
}

/**
 * Verifies a Google ID token and returns who it belongs to.
 *
 * The token is a JWT signed by Google. `verifyIdToken` checks the signature
 * against Google's published keys, that Google issued it, that it has not
 * expired, and — critically — that its audience is one of OUR client ids.
 * Without the audience check, a token minted for any other Google app would
 * be accepted here, letting anyone with an unrelated Google login sign in as
 * an arbitrary user.
 *
 * Nothing the client asserts about the user is trusted; identity comes only
 * from the verified payload.
 */
export async function verifyGoogleIdToken(env: Env, idToken: string): Promise<GoogleIdentity> {
  const audiences = [env.GOOGLE_CLIENT_ID, env.GOOGLE_ANDROID_CLIENT_ID].filter(
    (value): value is string => !!value,
  );

  if (audiences.length === 0) {
    // Misconfiguration must not silently degrade into accepting any token.
    throw new UnauthorizedError('Google sign-in is not configured on this server');
  }

  const client = new OAuth2Client();
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: audiences });
    payload = ticket.getPayload();
  } catch {
    throw new UnauthorizedError('Google sign-in failed. Please try again.');
  }

  if (!payload?.sub) {
    throw new UnauthorizedError('Google sign-in failed. Please try again.');
  }

  // Google only guarantees an email when the account actually has a verified
  // one. An unverified address must not be used to match an existing
  // account, or someone could claim an address they do not control.
  if (!payload.email || payload.email_verified !== true) {
    throw new UnauthorizedError('Your Google account has no verified email address.');
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}

/**
 * Finds or creates the user behind a verified Google identity.
 *
 * Three cases, in priority order:
 *
 *  1. Known googleId — the returning user. Matched on the Google subject
 *     rather than the email, because an email can be changed on the Google
 *     account while the subject stays stable.
 *  2. Same email, existing email/password account — link the two rather than
 *     creating a duplicate. Safe here ONLY because the email was verified by
 *     Google above; linking on an unverified address would be account
 *     takeover.
 *  3. Nobody — create a new account.
 */
export async function findOrCreateGoogleUser(prisma: PrismaClient, identity: GoogleIdentity) {
  const byGoogleId = await prisma.user.findUnique({ where: { googleId: identity.googleId } });
  if (byGoogleId) return byGoogleId;

  const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: identity.googleId,
        // authProvider records how the account was created, so it is left
        // alone — an email/password user who links Google keeps their
        // password and can still sign in either way.
        profilePhotoUrl: byEmail.profilePhotoUrl ?? identity.picture,
      },
    });
  }

  const created = await prisma.user.create({
    data: {
      email: identity.email,
      name: identity.name ?? identity.email.split('@')[0],
      googleId: identity.googleId,
      authProvider: 'google',
      profilePhotoUrl: identity.picture,
      // No passwordHash: this account can only ever be entered through
      // Google, so there is no password for anyone to guess or leak.
      profile: { create: {} },
    },
  });

  await seedBuiltInReminders(prisma, created.id);
  return created;
}
