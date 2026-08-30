import * as Sentry from '@sentry/node';
import type { Env } from '../config/env';

/**
 * Fields that must never leave this server, mirroring the redaction already
 * applied to logs (see lib/logger.ts). Sentry attaches request data to every
 * event by default, and for a health app that would ship food descriptions,
 * weights, health conditions and medications to a third party.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'token',
  'authorization',
  'imagebase64',
  'audiobase64',
  'text',
  'name',
  'email',
  'notes',
  'othertext',
  'message',
  'content',
]);

const REDACTED = '[redacted]';

/**
 * Recursively strips anything that could carry personal or health content.
 *
 * Deliberately a denylist applied to EVERY key at every depth, rather than a
 * list of known request shapes: a new endpoint should not be able to start
 * leaking data simply because nobody remembered to update this file.
 */
function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1));
  if (typeof value !== 'object') return value;

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : scrub(item, depth + 1);
  }
  return result;
}

/**
 * Starts error reporting, if a DSN is configured.
 *
 * Absence of a DSN is a supported state, not a failure: local development and
 * the test suite run without one and must not report anything anywhere.
 */
export function initObservability(env: Env): boolean {
  if (!env.SENTRY_DSN || env.NODE_ENV === 'test') return false;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Errors only. Performance tracing on every request would sample health
    // endpoints and cost money for data nobody is going to read.
    tracesSampleRate: 0,
    // Sentry's own PII collection stays off; what little context we want is
    // attached explicitly below.
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        // The URL path is useful; the query string and body are not worth the risk.
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.query_string;
        if (event.request.headers) {
          event.request.headers = scrub(event.request.headers) as Record<string, string>;
        }
      }
      if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>;
      if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;

      // Breadcrumbs are the most likely place for a stray food description.
      event.breadcrumbs = event.breadcrumbs?.map((crumb) => ({
        ...crumb,
        data: scrub(crumb.data) as Record<string, unknown> | undefined,
        message: undefined,
      }));

      return event;
    },
  });

  return true;
}

/**
 * Reports an error, tagged with the route and the user's id.
 *
 * The id only — never their email or name. It is enough to see "this user hit
 * this repeatedly" without the report identifying a person.
 */
export function captureError(error: unknown, context: { route?: string; userId?: string }): void {
  Sentry.withScope((scope) => {
    if (context.userId) scope.setUser({ id: context.userId });
    if (context.route) scope.setTag('route', context.route);
    Sentry.captureException(error);
  });
}

export { Sentry };
