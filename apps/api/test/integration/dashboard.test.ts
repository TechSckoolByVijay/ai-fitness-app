import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from './helpers';

describe('GET /dashboard/today', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an empty-state shape for a brand-new user', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: uniqueEmail('dash-empty'), password: 'password123', name: 'Dash Tester' },
    });
    const { accessToken } = registerRes.json();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.caloriesConsumed).toBe(0);
    expect(body.calorieTarget).toBeNull();
    expect(body.meals).toEqual([]);
    expect(body.steps).toBeNull();
  });

  it('reflects calorie/protein targets computed after onboarding completes', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: uniqueEmail('dash-onboard'), password: 'password123', name: 'Dash Tester' },
    });
    const { accessToken } = registerRes.json();

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/profile',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        dateOfBirth: '1995-06-15',
        sex: 'male',
        heightCm: 175,
        currentWeightKg: 80,
        activityLevel: 'moderate',
      },
    });
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/goals',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { primaryGoal: 'lose_weight' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/me/onboarding/complete',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.calorieTarget).toBeGreaterThan(0);
    expect(body.proteinTarget).toBeGreaterThan(0);
    expect(body.waterTargetMl).toBeGreaterThan(0);
  });

  it('groups multiple meals logged today and sums their totals', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: uniqueEmail('dash-multi'), password: 'password123', name: 'Dash Tester' },
    });
    const { accessToken } = registerRes.json();
    const nowISO = new Date().toISOString();

    for (const text of ['I ate a banana.', 'I had 200 grams of dal.']) {
      const interpretRes = await app.inject({
        method: 'POST',
        url: '/api/v1/events/interpret',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { text, nowISO },
      });
      const { meal } = interpretRes.json().event;
      await app.inject({
        method: 'POST',
        url: '/api/v1/food/entries',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { mealType: meal.mealType, loggedAt: meal.loggedAt, items: meal.items },
      });
    }

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const body = response.json();
    expect(body.meals).toHaveLength(2);
    expect(body.caloriesConsumed).toBeGreaterThan(0);
  });

  it('rejects unauthenticated requests', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/dashboard/today' });
    expect(response.statusCode).toBe(401);
  });
});

describe('GET /dashboard/history', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('defaults to 14 days, zero-filled, oldest first, ending today', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: uniqueEmail('hist-empty'), password: 'password123', name: 'Hist Tester' },
    });
    const { accessToken } = registerRes.json();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/history',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.days).toHaveLength(14);
    expect(body.days.every((d: { caloriesConsumed: number }) => d.caloriesConsumed === 0)).toBe(true);
    expect(body.days[13].date).toBe(new Date().toISOString().slice(0, 10));
    expect(body.calorieTarget).toBeNull();
  });

  it('respects a custom ?days= and includes today\'s logged totals', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: uniqueEmail('hist-days'), password: 'password123', name: 'Hist Tester' },
    });
    const { accessToken } = registerRes.json();
    const nowISO = new Date().toISOString();

    const interpretRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { text: 'I ate a banana.', nowISO },
    });
    const { meal } = interpretRes.json().event;
    await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { mealType: meal.mealType, loggedAt: meal.loggedAt, items: meal.items },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/history?days=7',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = response.json();
    expect(body.days).toHaveLength(7);
    expect(body.days[6].caloriesConsumed).toBeGreaterThan(0);
  });

  it('rejects unauthenticated requests', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/dashboard/history' });
    expect(response.statusCode).toBe(401);
  });
});
