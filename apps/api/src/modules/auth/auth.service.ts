import type { PrismaClient } from '@prisma/client';
import type { Env } from '../../config/env';
import { ConflictError, UnauthorizedError } from '../../lib/errors';
import { seedBuiltInReminders } from '../notifications/notification-preferences.service';
import { hashPassword, verifyPassword } from './password';
import { generateRefreshToken, hashRefreshToken, REFRESH_TOKEN_TTL_MS } from './tokens';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  profilePhotoUrl: string | null;
}

type SignAccessToken = (userId: string) => string;

async function issueRefreshToken(
  prisma: PrismaClient,
  env: Env,
  userId: string,
): Promise<string> {
  const token = generateRefreshToken();
  const tokenHash = hashRefreshToken(token, env.JWT_REFRESH_SECRET);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
  });
  return token;
}

function toAuthUser(user: { id: string; email: string; name: string; profilePhotoUrl: string | null }): AuthUserRecord {
  return { id: user.id, email: user.email, name: user.name, profilePhotoUrl: user.profilePhotoUrl };
}

export async function registerUser(
  prisma: PrismaClient,
  env: Env,
  signAccessToken: SignAccessToken,
  input: { email: string; password: string; name: string },
): Promise<{ user: AuthUserRecord } & AuthTokens> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      profile: { create: {} },
    },
  });

  // Reminders are addressed by row id, so the built-in three must exist from
  // the start rather than being created lazily on first edit.
  await seedBuiltInReminders(prisma, user.id);

  const accessToken = signAccessToken(user.id);
  const refreshToken = await issueRefreshToken(prisma, env, user.id);

  return { user: toAuthUser(user), accessToken, refreshToken };
}

export async function loginUser(
  prisma: PrismaClient,
  env: Env,
  signAccessToken: SignAccessToken,
  input: { email: string; password: string },
): Promise<{ user: AuthUserRecord } & AuthTokens> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = await issueRefreshToken(prisma, env, user.id);

  return { user: toAuthUser(user), accessToken, refreshToken };
}

export async function refreshTokens(
  prisma: PrismaClient,
  env: Env,
  signAccessToken: SignAccessToken,
  refreshToken: string,
): Promise<AuthTokens> {
  const tokenHash = hashRefreshToken(refreshToken, env.JWT_REFRESH_SECRET);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Rotate: revoke the used token and issue a fresh one.
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

  const accessToken = signAccessToken(record.userId);
  const newRefreshToken = await issueRefreshToken(prisma, env, record.userId);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(
  prisma: PrismaClient,
  env: Env,
  refreshToken: string,
): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken, env.JWT_REFRESH_SECRET);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
