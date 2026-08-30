import {
  AuthResponseSchema,
  GoogleAuthRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
} from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { loginUser, logoutUser, refreshTokens, registerUser, signInWithGoogle } from './auth.service';
import { findOrCreateGoogleUser, verifyGoogleIdToken } from './google-auth.service';

// Stricter than the app-wide default (app.ts) — register/login are the
// highest-value target for credential-stuffing or spam-account abuse once
// this API is reachable from the public internet, so they get their own
// tighter per-IP ceiling rather than relying on the generic 200/min limit.
const AUTH_RATE_LIMIT = { max: 10, timeWindow: '1 minute' };

export async function authRoutes(app: FastifyInstance) {
  const signAccessToken = (userId: string) => app.jwt.sign({ sub: userId });

  app.post('/auth/register', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const body = RegisterRequestSchema.parse(request.body);
    const result = await registerUser(app.prisma, app.env, signAccessToken, body);
    reply.status(201).send(AuthResponseSchema.parse(result));
  });

  app.post('/auth/login', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const body = LoginRequestSchema.parse(request.body);
    const result = await loginUser(app.prisma, app.env, signAccessToken, body);
    reply.send(AuthResponseSchema.parse(result));
  });

  app.post('/auth/google', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const body = GoogleAuthRequestSchema.parse(request.body);
    // Verify first, then look up. The client's claims about who it is are
    // never consulted — identity comes only from Google's signed token.
    const identity = await verifyGoogleIdToken(app.env, body.idToken);
    const user = await findOrCreateGoogleUser(app.prisma, identity);
    const result = await signInWithGoogle(app.prisma, app.env, signAccessToken, user);
    reply.send(AuthResponseSchema.parse(result));
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = RefreshRequestSchema.parse(request.body);
    const result = await refreshTokens(app.prisma, app.env, signAccessToken, body.refreshToken);
    reply.send(result);
  });

  app.post('/auth/logout', async (request, reply) => {
    const body = RefreshRequestSchema.parse(request.body);
    await logoutUser(app.prisma, app.env, body.refreshToken);
    reply.status(204).send();
  });
}
