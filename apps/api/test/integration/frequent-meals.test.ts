import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from './helpers';

async function registerAndGetToken(app: FastifyInstance, prefix: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Frequent Meals Tester' },
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

const OATMEAL_ITEM = {
  name: 'oatmeal',
  quantity: 1,
  unit: 'bowl',
  confidence: 0.9,
  nutrition: { calories: 150, proteinG: 5, carbsG: 27, fatG: 3, fiberG: 4, isEstimate: true, source: 'mock' },
};

async function logMeal(app: FastifyInstance, token: string, items: unknown[]) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/food/entries',
    headers: { authorization: `Bearer ${token}` },
    payload: { mealType: 'breakfast', loggedAt: new Date().toISOString(), items },
  });
}

describe('frequent meal tracking', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not surface a meal logged only once', async () => {
    const token = await registerAndGetToken(app, 'frequent-once');
    await logMeal(app, token, [BANANA_ITEM]);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/frequent-meals',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.json().frequentMeals).toHaveLength(0);
  });

  it('surfaces a meal after the second identical log, with an incremented useCount', async () => {
    const token = await registerAndGetToken(app, 'frequent-twice');
    await logMeal(app, token, [BANANA_ITEM]);
    await logMeal(app, token, [BANANA_ITEM]);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/frequent-meals',
      headers: { authorization: `Bearer ${token}` },
    });
    const frequentMeals = listRes.json().frequentMeals;
    expect(frequentMeals).toHaveLength(1);
    expect(frequentMeals[0].useCount).toBe(2);
    expect(frequentMeals[0].name).toBe('banana');
    expect(frequentMeals[0].mealType).toBe('breakfast');
  });

  it('treats different item combinations as distinct, ranked by use count', async () => {
    const token = await registerAndGetToken(app, 'frequent-distinct');
    await logMeal(app, token, [BANANA_ITEM]);
    await logMeal(app, token, [BANANA_ITEM]);
    await logMeal(app, token, [BANANA_ITEM]);
    await logMeal(app, token, [OATMEAL_ITEM]);
    await logMeal(app, token, [OATMEAL_ITEM]);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/frequent-meals',
      headers: { authorization: `Bearer ${token}` },
    });
    const frequentMeals = listRes.json().frequentMeals;
    expect(frequentMeals).toHaveLength(2);
    expect(frequentMeals[0].name).toBe('banana');
    expect(frequentMeals[0].useCount).toBe(3);
    expect(frequentMeals[1].name).toBe('oatmeal');
    expect(frequentMeals[1].useCount).toBe(2);
  });

  it('a frequent meal can be saved as a real favorite', async () => {
    const token = await registerAndGetToken(app, 'frequent-to-favorite');
    const auth = { authorization: `Bearer ${token}` };
    await logMeal(app, token, [BANANA_ITEM]);
    await logMeal(app, token, [BANANA_ITEM]);

    const listRes = await app.inject({ method: 'GET', url: '/api/v1/frequent-meals', headers: auth });
    const frequentMeal = listRes.json().frequentMeals[0];

    const favoriteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: auth,
      payload: { name: 'My banana breakfast', mealType: frequentMeal.mealType, items: frequentMeal.items },
    });
    expect(favoriteRes.statusCode).toBe(201);
  });
});
