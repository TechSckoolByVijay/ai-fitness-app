import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from './helpers';

describe('DELETE /me', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerUser(prefix: string) {
    const email = uniqueEmail(prefix);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'password123', name: 'Delete Tester' },
    });
    return { email, accessToken: response.json().accessToken as string };
  }

  it('rejects unauthenticated requests', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/api/v1/me' });
    expect(response.statusCode).toBe(401);
  });

  it('rejects deletion without a password', async () => {
    const { accessToken } = await registerUser('del-nopass');
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it('rejects deletion with the wrong password', async () => {
    const { accessToken } = await registerUser('del-wrongpass');
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { password: 'not-the-right-password' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('deletes the account with the correct password, cascading owned data, and invalidates the session', async () => {
    const { email, accessToken } = await registerUser('del-ok');

    await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        mealType: 'breakfast',
        loggedAt: new Date().toISOString(),
        items: [
          {
            name: 'banana',
            quantity: 1,
            unit: 'whole',
            nutrition: { calories: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3, fiberG: 2.6, isEstimate: true, source: 'mock' },
          },
        ],
      },
    });

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { password: 'password123' },
    });
    expect(deleteResponse.statusCode).toBe(204);

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(meResponse.statusCode).toBe(404);

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' },
    });
    expect(loginResponse.statusCode).toBe(401);
  });
});
