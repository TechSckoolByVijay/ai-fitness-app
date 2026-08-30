import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { findOrCreateGoogleUser, verifyGoogleIdToken } from '../../src/modules/auth/google-auth.service';
import { loadEnv } from '../../src/config/env';
import { createTestApp, uniqueEmail } from './helpers';

/**
 * Google's own verification is mocked — these tests are about what this app
 * does with a verified identity, not about re-testing google-auth-library's
 * JWT checking. The one thing asserted about verification itself is that an
 * unconfigured server refuses rather than trusting anything.
 */
const mockVerifyIdToken = vi.fn();
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = mockVerifyIdToken;
  },
}));

function googleTicket(payload: Record<string, unknown>) {
  return { getPayload: () => payload };
}

describe('Google sign-in', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    mockVerifyIdToken.mockReset();
  });

  const envWithClients = () =>
    ({ ...loadEnv(), GOOGLE_CLIENT_ID: 'web-client-id', GOOGLE_ANDROID_CLIENT_ID: 'android-client-id' });

  it('refuses to verify when no client id is configured', async () => {
    const env = { ...loadEnv(), GOOGLE_CLIENT_ID: undefined, GOOGLE_ANDROID_CLIENT_ID: undefined };
    // Must fail closed: an unconfigured server accepting any token would let
    // anyone sign in as anyone.
    await expect(verifyGoogleIdToken(env, 'any-token')).rejects.toThrow(/not configured/i);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('checks the token audience against both of our client ids', async () => {
    mockVerifyIdToken.mockResolvedValue(
      googleTicket({ sub: 'g-1', email: 'a@example.com', email_verified: true, name: 'A' }),
    );

    await verifyGoogleIdToken(envWithClients(), 'token');

    // Without an audience check, a token minted for any other Google app
    // would be accepted here.
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'token',
      audience: ['web-client-id', 'android-client-id'],
    });
  });

  it('rejects an account whose email Google has not verified', async () => {
    mockVerifyIdToken.mockResolvedValue(
      googleTicket({ sub: 'g-2', email: 'unverified@example.com', email_verified: false }),
    );

    // Linking on an unverified address would be account takeover: anyone
    // could claim an address they do not control.
    await expect(verifyGoogleIdToken(envWithClients(), 'token')).rejects.toThrow(/verified email/i);
  });

  it('rejects a token Google will not vouch for', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token signature'));
    await expect(verifyGoogleIdToken(envWithClients(), 'forged')).rejects.toThrow(/failed/i);
  });

  it('creates a new user, with reminders seeded like any other signup', async () => {
    const email = uniqueEmail('google-new');
    const user = await findOrCreateGoogleUser(app.prisma, {
      googleId: `g-${email}`,
      email,
      name: 'New Google User',
      picture: 'https://example.com/a.jpg',
    });

    expect(user.authProvider).toBe('google');
    expect(user.passwordHash).toBeNull();

    const reminders = await app.prisma.notificationPreference.findMany({ where: { userId: user.id } });
    expect(reminders).toHaveLength(3);
  });

  it('returns the same user on a second sign-in rather than duplicating', async () => {
    const email = uniqueEmail('google-repeat');
    const identity = { googleId: `g-${email}`, email, name: 'Repeat', picture: null };

    const first = await findOrCreateGoogleUser(app.prisma, identity);
    const second = await findOrCreateGoogleUser(app.prisma, identity);

    expect(second.id).toBe(first.id);
  });

  it('matches a returning user on the Google subject, not the email', async () => {
    const email = uniqueEmail('google-rename');
    const googleId = `g-${email}`;
    const first = await findOrCreateGoogleUser(app.prisma, { googleId, email, name: 'X', picture: null });

    // The user changed the email on their Google account; the subject is stable.
    const second = await findOrCreateGoogleUser(app.prisma, {
      googleId,
      email: uniqueEmail('google-renamed'),
      name: 'X',
      picture: null,
    });

    expect(second.id).toBe(first.id);
  });

  it('links Google to an existing email/password account instead of duplicating it', async () => {
    const email = uniqueEmail('google-link');
    const registered = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'password123', name: 'Existing User' },
    });
    const existingId = registered.json().user.id;

    const linked = await findOrCreateGoogleUser(app.prisma, {
      googleId: `g-${email}`,
      email,
      name: 'Existing User',
      picture: null,
    });

    expect(linked.id).toBe(existingId);
    // Their password still works — linking must not lock them out of the
    // way they already sign in.
    expect(linked.passwordHash).not.toBeNull();
    expect(linked.authProvider).toBe('email');
  });

  it('issues normal tokens over the HTTP route', async () => {
    const email = uniqueEmail('google-route');
    mockVerifyIdToken.mockResolvedValue(
      googleTicket({ sub: `g-${email}`, email, email_verified: true, name: 'Route User' }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: { idToken: 'valid-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().accessToken).toBeTruthy();
    expect(response.json().refreshToken).toBeTruthy();
    expect(response.json().user.email).toBe(email);
  });

  it('rejects a request with no token', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/google', payload: {} });
    expect(response.statusCode).toBe(400);
  });
});
