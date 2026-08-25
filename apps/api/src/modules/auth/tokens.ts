import { createHmac, randomBytes } from 'node:crypto';

const REFRESH_TOKEN_BYTES = 48;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

/**
 * Opaque refresh tokens are never stored raw — only an HMAC (keyed with
 * JWT_REFRESH_SECRET as a pepper) is persisted, so a DB leak alone can't be
 * replayed as a valid refresh token.
 */
export function hashRefreshToken(token: string, secret: string): string {
  return createHmac('sha256', secret).update(token).digest('hex');
}
