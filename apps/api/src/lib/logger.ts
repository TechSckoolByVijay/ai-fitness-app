import type { LoggerOptions } from 'pino';
import type { Env } from '../config/env';

/**
 * Returned as plain pino options (not a pre-built instance) so it can be
 * passed straight to Fastify's `logger` constructor option across Fastify
 * versions without depending on a specific "attach an instance" API shape.
 */
export function getLoggerOptions(env: Env): LoggerOptions {
  return {
    level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV === 'production' || env.NODE_ENV === 'test'
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
    // Never log sensitive health/food content or credentials (spec section 31/41).
    redact: {
      paths: [
        'req.headers.authorization',
        'password',
        'passwordHash',
        'accessToken',
        'refreshToken',
        '*.password',
        '*.accessToken',
        '*.refreshToken',
      ],
      remove: true,
    },
  };
}
