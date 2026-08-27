import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from './helpers';

describe('GET /insights/today', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAndOnboard(prefix: string, primaryGoal: string) {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Insights Tester' },
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
      payload: { primaryGoal },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/me/onboarding/complete',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    return accessToken;
  }

  it('rejects unauthenticated requests', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/insights/today' });
    expect(response.statusCode).toBe(401);
  });

  it('nudges to complete profile setup before any target exists', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: uniqueEmail('insights-notarget'), password: 'password123', name: 'Insights Tester' },
    });
    const { accessToken } = registerRes.json();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/insights/today',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const { cards } = response.json();
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('no-target');
  });

  it('nudges (not blames) a fully-onboarded user who has not logged any meals yet', async () => {
    const accessToken = await registerAndOnboard('insights-nolog', 'lose_weight');

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/insights/today',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const { cards } = response.json();
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('yesterday-no-log');
    expect(cards[0].tone).toBe('nudge');
  });

  it('reflects a real logged deficit from yesterday for a weight-loss goal', async () => {
    const accessToken = await registerAndOnboard('insights-deficit', 'lose_weight');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const interpretRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { text: 'I ate a banana.', nowISO: yesterday },
    });
    const { meal } = interpretRes.json().events[0];
    await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { mealType: meal.mealType, loggedAt: meal.loggedAt, items: meal.items },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/insights/today',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const { cards } = response.json();
    const yesterdayCard = cards.find((c: { id: string }) => c.id === 'yesterday-calories');
    expect(yesterdayCard).toBeTruthy();
    // A single banana is a huge deficit against any real calorie target, so
    // this should read as favorable for a weight-loss goal.
    expect(yesterdayCard.tone).toBe('positive');
  });
});
