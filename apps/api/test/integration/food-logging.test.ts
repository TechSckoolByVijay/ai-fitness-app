import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from './helpers';

async function registerAndGetToken(app: FastifyInstance, prefix: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Food Tester' },
  });
  return response.json().accessToken;
}

describe('food logging round trip', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('interprets a high-confidence utterance and returns estimated macros without persisting', async () => {
    const token = await registerAndGetToken(app, 'interpret');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'I ate a banana.', nowISO: '2026-08-25T09:00:00.000Z' },
    });

    expect(response.statusCode).toBe(200);
    const { events } = response.json();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('food');
    const meal = events[0].meal;
    expect(meal.items).toHaveLength(1);
    expect(meal.items[0].name).toBe('banana');
    expect(meal.tier).toBe('high');
    expect(meal.autoLog).toBe(false);
    expect(meal.estimatedTotals.calories).toBeGreaterThan(0);

    // Not persisted yet — dashboard should still show zero.
    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashboard.json().meals).toHaveLength(0);
  });

  it('confirms an interpreted meal, persists it, and updates the daily summary', async () => {
    const token = await registerAndGetToken(app, 'confirm');
    const nowISO = new Date().toISOString();

    const interpretRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'I ate a banana.', nowISO },
    });
    const { meal } = interpretRes.json().events[0];

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mealType: meal.mealType,
        loggedAt: meal.loggedAt,
        sourceText: meal.sourceText,
        confidenceTier: meal.tier,
        items: meal.items,
      },
    });
    expect(createRes.statusCode).toBe(201);

    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${token}` },
    });
    const dashboardBody = dashboard.json();
    expect(dashboardBody.meals).toHaveLength(1);
    expect(dashboardBody.caloriesConsumed).toBeCloseTo(meal.estimatedTotals.calories, 1);
  });

  it('parses a complex multi-item utterance into 3 items', async () => {
    const token = await registerAndGetToken(app, 'complex');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        text: "At 12 o'clock I ate two medium chapatis, around 200 grams of less-oily medium-spicy curry, and a bowl of salad.",
        nowISO: '2026-08-25T09:00:00.000Z',
      },
    });

    const { meal } = response.json().events[0];
    expect(meal.items).toHaveLength(3);
    expect(meal.items.map((i: { name: string }) => i.name)).toEqual(['chapati', 'curry', 'salad']);
  });

  it('returns a clarifying question for a low-confidence utterance', async () => {
    const token = await registerAndGetToken(app, 'lowconf');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'I had some curry.', nowISO: '2026-08-25T09:00:00.000Z' },
    });

    const { meal } = response.json().events[0];
    expect(meal.tier).toBe('low');
    expect(meal.autoLog).toBe(false);
    expect(meal.clarifyingQuestion).toBeTruthy();
    expect(meal.quickOptions.length).toBeGreaterThan(0);
  });

  it('interprets a meal from a photo (mock mode returns an honest placeholder)', async () => {
    const token = await registerAndGetToken(app, 'photo');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${token}` },
      payload: { imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/', nowISO: '2026-08-25T09:00:00.000Z' },
    });

    expect(response.statusCode).toBe(200);
    const { events } = response.json();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('food');
    const { meal } = events[0];
    expect(meal.sourceText).toBe('[Photo]');
    expect(meal.items).toHaveLength(1);
    expect(meal.items[0].name).toBe('meal from photo');
    expect(meal.tier).toBe('medium');
  });

  it('rejects an interpret request with neither text, audio, image, nor mockTranscriptId', async () => {
    const token = await registerAndGetToken(app, 'novalid');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${token}` },
      payload: { nowISO: '2026-08-25T09:00:00.000Z' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('edits a persisted entry and recalculates the daily summary', async () => {
    const token = await registerAndGetToken(app, 'edit');
    const nowISO = new Date().toISOString();

    const interpretRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'I ate a banana.', nowISO },
    });
    const { meal } = interpretRes.json().events[0];

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mealType: meal.mealType,
        loggedAt: meal.loggedAt,
        sourceText: meal.sourceText,
        items: meal.items,
      },
    });
    const entry = createRes.json();
    const originalCalories = entry.totals.calories;

    const editedItems = entry.items.map((item: { quantity: number; nutrition: { calories: number } }) => ({
      ...item,
      quantity: item.quantity * 2,
      nutrition: { ...item.nutrition, calories: item.nutrition.calories * 2 },
    }));

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/food/entries/${entry.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { items: editedItems },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().status).toBe('edited');

    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashboard.json().caloriesConsumed).toBeCloseTo(originalCalories * 2, 1);
  });

  it('deletes an entry and cross-user access is denied', async () => {
    const tokenA = await registerAndGetToken(app, 'deleteA');
    const tokenB = await registerAndGetToken(app, 'deleteB');

    const interpretRes = await app.inject({
      method: 'POST',
      url: '/api/v1/events/interpret',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { text: 'I ate a banana.', nowISO: new Date().toISOString() },
    });
    const { meal } = interpretRes.json().events[0];

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { mealType: meal.mealType, loggedAt: meal.loggedAt, items: meal.items },
    });
    const entry = createRes.json();

    const crossUserDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/food/entries/${entry.id}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(crossUserDelete.statusCode).toBe(404);

    const ownerDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/food/entries/${entry.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(ownerDelete.statusCode).toBe(204);
  });
});
