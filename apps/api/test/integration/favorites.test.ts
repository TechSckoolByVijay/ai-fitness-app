import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from './helpers';

async function registerAndGetToken(app: FastifyInstance, prefix: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Favorites Tester' },
  });
  return response.json().accessToken;
}

const BANANA_ITEM = {
  name: 'banana',
  quantity: 1,
  unit: 'whole',
  confidence: 0.9,
  nutrition: { calories: 105, proteinG: 1.3, carbsG: 27.1, fatG: 0.4, fiberG: 3.1, isEstimate: true, source: 'mock' },
};

describe('favorite foods', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('saves a favorite and lists it back', async () => {
    const token = await registerAndGetToken(app, 'favorites-create');
    const auth = { authorization: `Bearer ${token}` };

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: auth,
      payload: { name: 'Usual breakfast', mealType: 'breakfast', items: [BANANA_ITEM] },
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().name).toBe('Usual breakfast');
    expect(createRes.json().items).toHaveLength(1);

    const listRes = await app.inject({ method: 'GET', url: '/api/v1/favorites', headers: auth });
    expect(listRes.json().favorites).toHaveLength(1);
  });

  it('logs a favorite as a real food entry and updates the daily summary, without re-running interpretation', async () => {
    const token = await registerAndGetToken(app, 'favorites-log');
    const auth = { authorization: `Bearer ${token}` };

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: auth,
      payload: { name: 'Usual breakfast', mealType: 'breakfast', items: [BANANA_ITEM] },
    });
    const favoriteId = createRes.json().id;

    const logRes = await app.inject({
      method: 'POST',
      url: `/api/v1/favorites/${favoriteId}/log`,
      headers: auth,
      payload: {},
    });
    expect(logRes.statusCode).toBe(201);
    expect(logRes.json().mealType).toBe('breakfast');
    expect(logRes.json().sourceText).toBe('Favorite: Usual breakfast');
    expect(logRes.json().totals.calories).toBeCloseTo(105, 0);

    const dashboard = await app.inject({ method: 'GET', url: '/api/v1/dashboard/today', headers: auth });
    expect(dashboard.json().caloriesConsumed).toBeCloseTo(105, 0);
  });

  it('logging a favorite with no request body defaults loggedAt to now', async () => {
    const token = await registerAndGetToken(app, 'favorites-nobody');
    const auth = { authorization: `Bearer ${token}` };

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: auth,
      payload: { name: 'Quick snack', mealType: 'snack', items: [BANANA_ITEM] },
    });
    const favoriteId = createRes.json().id;

    const logRes = await app.inject({
      method: 'POST',
      url: `/api/v1/favorites/${favoriteId}/log`,
      headers: auth,
    });
    expect(logRes.statusCode).toBe(201);
  });

  it('deletes a favorite', async () => {
    const token = await registerAndGetToken(app, 'favorites-delete');
    const auth = { authorization: `Bearer ${token}` };

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: auth,
      payload: { name: 'Old favorite', mealType: 'lunch', items: [BANANA_ITEM] },
    });
    const favoriteId = createRes.json().id;

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/favorites/${favoriteId}`,
      headers: auth,
    });
    expect(deleteRes.statusCode).toBe(204);

    const listRes = await app.inject({ method: 'GET', url: '/api/v1/favorites', headers: auth });
    expect(listRes.json().favorites).toHaveLength(0);
  });

  it('404s logging or deleting another user\'s favorite', async () => {
    const tokenA = await registerAndGetToken(app, 'favorites-cross-a');
    const tokenB = await registerAndGetToken(app, 'favorites-cross-b');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: 'A\'s favorite', mealType: 'lunch', items: [BANANA_ITEM] },
    });
    const favoriteId = createRes.json().id;

    const logAsB = await app.inject({
      method: 'POST',
      url: `/api/v1/favorites/${favoriteId}/log`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(logAsB.statusCode).toBe(404);

    const deleteAsB = await app.inject({
      method: 'DELETE',
      url: `/api/v1/favorites/${favoriteId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(deleteAsB.statusCode).toBe(404);
  });
});
