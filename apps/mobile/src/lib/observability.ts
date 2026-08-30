import * as Sentry from '@sentry/react-native';

/**
 * Crash and error reporting for the app.
 *
 * Until now a crash on a user's phone produced no signal anywhere — three
 * devices hung on a white screen and the only reason the cause was found is
 * that someone described it out loud. That does not scale past people you
 * can phone.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/**
 * Keys that must never leave the device. This app's ordinary payloads are
 * health data — what someone ate, what they weigh, what conditions they
 * have — so the denylist is applied to every key at every depth rather than
 * to a list of known shapes. A new screen should not be able to start
 * leaking simply because nobody remembered to update this file.
 */
const SENSITIVE_KEYS = new Set([
  'password',
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
  'label',
  'notes',
  'othertext',
  'message',
  'content',
  'transcript',
]);

const REDACTED = '[redacted]';

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
 * Starts reporting, if a DSN was baked into the build.
 *
 * No DSN is a supported state: Expo Go and local development report nothing,
 * and must not fail because of it.
 */
export function initObservability(): boolean {
  if (!DSN) return false;

  Sentry.init({
    dsn: DSN,
    // Errors only. Performance tracing would sample every screen transition
    // for data nobody is going to read at this stage.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.query_string;
      }
      if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>;
      if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;

      // Breadcrumbs capture navigation and network activity automatically —
      // the likeliest place for a meal description or an auth token to appear.
      event.breadcrumbs = event.breadcrumbs?.map((crumb) => ({
        ...crumb,
        message: undefined,
        data: scrub(crumb.data) as Record<string, unknown> | undefined,
      }));

      return event;
    },
  });

  return true;
}

/** Ties reports to a user by id only — never their email or name. */
export function identifyUser(userId: string | null): void {
  if (!DSN) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export { Sentry };
