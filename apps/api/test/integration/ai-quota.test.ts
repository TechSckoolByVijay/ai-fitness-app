import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { loadEnv } from '../../src/config/env';
import { uniqueEmail } from './helpers';

describe('per-user daily AI quota', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Tiny limits so the test exercises the cutoff without dozens of calls.
    const env = loadEnv({
      ...process.env,
      AI_DAILY_COACH_LIMIT: '2',
      AI_DAILY_INTERPRET_LIMIT: '2',
    });
    app = await buildApp(env);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAndGetToken(prefix: string): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Quota Tester' },
    });
    return response.json().accessToken;
  }

  it('blocks coach messages past the daily limit with a friendly 429', async () => {
    const token = await registerAndGetToken('quota-coach');

    for (let i = 0; i < 2; i++) {
      const ok = await app.inject({
        method: 'POST',
        url: '/api/v1/coach/messages',
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'Suggest a snack' },
      });
      expect(ok.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/v1/coach/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Suggest a snack' },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error).toBe('QUOTA_EXCEEDED');
    expect(blocked.json().message).toMatch(/resets/i);
  });

  it('blocks interpret calls past the daily limit', async () => {
    const token = await registerAndGetToken('quota-interpret');

    for (let i = 0; i < 2; i++) {
      const ok = await app.inject({
        method: 'POST',
        url: '/api/v1/events/interpret',
        headers: { authorization: `Bearer ${token}` },
        payload: { text: 'I ate a banana.', nowISO: new Date().toISOString() },
      });
      expect(ok.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'I ate a banana.', nowISO: new Date().toISOString() },
    });
    expect(blocked.statusCode).toBe(429);
  });

  it("one user's quota does not affect another user", async () => {
    const tokenA = await registerAndGetToken('quota-a');
    const tokenB = await registerAndGetToken('quota-b');

    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/coach/messages',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { message: 'Suggest a snack' },
      });
    }

    const freshUser = await app.inject({
      method: 'POST',
      url: '/api/v1/coach/messages',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { message: 'Suggest a snack' },
    });
    expect(freshUser.statusCode).toBe(200);
  });
});
