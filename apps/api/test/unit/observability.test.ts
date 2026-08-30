import { describe, expect, it, vi } from 'vitest';

const initMock = vi.fn();
vi.mock('@sentry/node', () => ({
  init: (options: unknown) => initMock(options),
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

import { loadEnv } from '../../src/config/env';
import { initObservability } from '../../src/lib/observability';

const BASE = {
  DATABASE_URL: 'postgresql://u:p@localhost:5433/db',
  JWT_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'y'.repeat(32),
};

const CONFIGURED = { NODE_ENV: 'production', SENTRY_DSN: 'https://key@example.ingest.sentry.io/1' };

/** Runs the real beforeSend that init() was configured with. */
function beforeSendFor(env: Record<string, string>) {
  initMock.mockClear();
  initObservability(loadEnv({ ...BASE, ...env } as NodeJS.ProcessEnv));
  const options = initMock.mock.calls[0]?.[0] as { beforeSend: (e: unknown) => unknown } | undefined;
  if (!options) throw new Error('Sentry was not initialised');
  return options.beforeSend;
}

describe('initObservability', () => {
  it('stays off when no DSN is configured', () => {
    initMock.mockClear();
    expect(initObservability(loadEnv({ ...BASE, NODE_ENV: 'production' } as NodeJS.ProcessEnv))).toBe(false);
    expect(initMock).not.toHaveBeenCalled();
  });

  it('stays off in tests even with a DSN, so the suite reports nothing', () => {
    initMock.mockClear();
    const env = { ...BASE, NODE_ENV: 'test', SENTRY_DSN: 'https://k@e.sentry.io/1' };
    expect(initObservability(loadEnv(env as NodeJS.ProcessEnv))).toBe(false);
    expect(initMock).not.toHaveBeenCalled();
  });

  it('turns on when configured, with tracing and PII off', () => {
    initMock.mockClear();
    expect(initObservability(loadEnv({ ...BASE, ...CONFIGURED } as NodeJS.ProcessEnv))).toBe(true);
    const options = initMock.mock.calls[0][0];
    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
  });
});

describe('beforeSend scrubbing', () => {
  it('drops the request body, cookies and query string entirely', () => {
    const beforeSend = beforeSendFor(CONFIGURED);
    const event = beforeSend({
      request: {
        url: '/api/v1/events',
        data: { text: 'I ate two rotis and dal' },
        cookies: 'session=abc',
        query_string: 'q=weight',
      },
    }) as { request: Record<string, unknown> };

    // A food description is health data; the path alone is what's useful.
    expect(event.request.data).toBeUndefined();
    expect(event.request.cookies).toBeUndefined();
    expect(event.request.query_string).toBeUndefined();
    expect(event.request.url).toBe('/api/v1/events');
  });

  it('redacts credentials in headers', () => {
    const beforeSend = beforeSendFor(CONFIGURED);
    const event = beforeSend({
      request: { headers: { authorization: 'Bearer secret-token', 'user-agent': 'okhttp' } },
    }) as { request: { headers: Record<string, string> } };

    expect(event.request.headers.authorization).toBe('[redacted]');
    expect(event.request.headers['user-agent']).toBe('okhttp');
  });

  it('redacts health and identity fields at any depth', () => {
    const beforeSend = beforeSendFor(CONFIGURED);
    const event = beforeSend({
      extra: {
        payload: { meal: { name: 'aloo paratha', notes: 'felt unwell after' }, quantity: 2 },
        email: 'someone@example.com',
      },
    }) as { extra: Record<string, unknown> };

    const meal = (event.extra.payload as Record<string, unknown>).meal as Record<string, unknown>;
    expect(meal.name).toBe('[redacted]');
    expect(meal.notes).toBe('[redacted]');
    expect(event.extra.email).toBe('[redacted]');
    // Non-sensitive structure is preserved, or the report is useless.
    expect((event.extra.payload as Record<string, unknown>).quantity).toBe(2);
  });

  it('strips breadcrumb messages, the likeliest place for a stray description', () => {
    const beforeSend = beforeSendFor(CONFIGURED);
    const event = beforeSend({
      breadcrumbs: [{ message: 'interpreting "two rotis and dal"', data: { imageBase64: 'AAAA', status: 500 } }],
    }) as { breadcrumbs: { message?: string; data: Record<string, unknown> }[] };

    expect(event.breadcrumbs[0].message).toBeUndefined();
    expect(event.breadcrumbs[0].data.imageBase64).toBe('[redacted]');
    expect(event.breadcrumbs[0].data.status).toBe(500);
  });

  it('survives an event with none of those fields', () => {
    const beforeSend = beforeSendFor(CONFIGURED);
    expect(() => beforeSend({ exception: { values: [] } })).not.toThrow();
  });

  it('does not recurse forever on a deeply nested payload', () => {
    const beforeSend = beforeSendFor(CONFIGURED);
    let deep: Record<string, unknown> = { name: 'leaf' };
    for (let i = 0; i < 50; i++) deep = { nested: deep };
    expect(() => beforeSend({ extra: { deep } })).not.toThrow();
  });
});
