import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from './helpers';

async function registerAndGetToken(app: FastifyInstance, prefix: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Vitals Tester' },
  });
  return response.json().accessToken;
}

describe('water logging', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs water, lists it, and updates the daily summary', async () => {
    const token = await registerAndGetToken(app, 'water');
    const nowISO = new Date().toISOString();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/water/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { amountMl: 250, loggedAt: nowISO },
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().amountMl).toBe(250);

    await app.inject({
      method: 'POST',
      url: '/api/v1/water/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { amountMl: 500, loggedAt: nowISO },
    });

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/water/entries',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.json().entries).toHaveLength(2);

    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashboard.json().waterConsumedMl).toBe(750);
  });

  it('deleting a water entry recomputes the daily summary', async () => {
    const token = await registerAndGetToken(app, 'water-del');
    const nowISO = new Date().toISOString();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/water/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { amountMl: 300, loggedAt: nowISO },
    });
    const entryId = createRes.json().id;

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/water/entries/${entryId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashboard.json().waterConsumedMl).toBe(0);
  });
});

describe('weight logging', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs weight, lists history, and updates the profile current weight', async () => {
    const token = await registerAndGetToken(app, 'weight');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/weight/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { weightKg: 72.5, loggedAt: new Date().toISOString() },
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().weightKg).toBe(72.5);

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.json().profile.currentWeightKg).toBe(72.5);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/weight/entries',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.json().entries).toHaveLength(1);
  });

  it('does not overwrite the current weight with a back-filled older entry', async () => {
    const token = await registerAndGetToken(app, 'weight-backfill');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await app.inject({
      method: 'POST',
      url: '/api/v1/weight/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { weightKg: 70, loggedAt: now.toISOString() },
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/weight/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { weightKg: 71, loggedAt: yesterday.toISOString() },
    });

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.json().profile.currentWeightKg).toBe(70);
  });

  it('deletes a weight entry', async () => {
    const token = await registerAndGetToken(app, 'weight-del');
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/weight/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { weightKg: 65, loggedAt: new Date().toISOString() },
    });
    const entryId = createRes.json().id;

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/weight/entries/${entryId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/weight/entries',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.json().entries).toHaveLength(0);
  });
});

describe('sleep logging', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs sleep, computes duration server-side, and updates the daily summary', async () => {
    const token = await registerAndGetToken(app, 'sleep');
    const wokeAt = new Date();
    const sleptAt = new Date(wokeAt.getTime() - 8 * 60 * 60 * 1000);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sleep/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { sleptAt: sleptAt.toISOString(), wokeAt: wokeAt.toISOString() },
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().durationMin).toBe(480);

    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashboard.json().sleepDurationMin).toBe(480);
  });

  it('rejects a sleep entry where wokeAt is before sleptAt', async () => {
    const token = await registerAndGetToken(app, 'sleep-invalid');
    const sleptAt = new Date();
    const wokeAt = new Date(sleptAt.getTime() - 60 * 60 * 1000);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/sleep/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { sleptAt: sleptAt.toISOString(), wokeAt: wokeAt.toISOString() },
    });
    expect(response.statusCode).toBe(400);
  });

  it('deletes a sleep entry and recomputes the daily summary', async () => {
    const token = await registerAndGetToken(app, 'sleep-del');
    const wokeAt = new Date();
    const sleptAt = new Date(wokeAt.getTime() - 7 * 60 * 60 * 1000);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sleep/entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { sleptAt: sleptAt.toISOString(), wokeAt: wokeAt.toISOString() },
    });
    const entryId = createRes.json().id;

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/sleep/entries/${entryId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(deleteRes.statusCode).toBe(204);

    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashboard.json().sleepDurationMin).toBe(0);
  });
});

describe('notification preferences', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns sensible defaults for a user who has never customized any category', async () => {
    const token = await registerAndGetToken(app, 'notif-defaults');

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/me/notification-preferences',
      headers: { authorization: `Bearer ${token}` },
    });
    const preferences = response.json().preferences;
    expect(preferences).toHaveLength(7);
    const water = preferences.find((p: { category: string }) => p.category === 'water');
    expect(water).toEqual({ category: 'water', enabled: true, preferredTime: null });
  });

  it('updates a single category and persists it', async () => {
    const token = await registerAndGetToken(app, 'notif-update');

    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/notification-preferences',
      headers: { authorization: `Bearer ${token}` },
      payload: { category: 'sleep', enabled: false, preferredTime: '21:30' },
    });
    expect(patchRes.statusCode).toBe(200);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me/notification-preferences',
      headers: { authorization: `Bearer ${token}` },
    });
    const sleep = getRes.json().preferences.find((p: { category: string }) => p.category === 'sleep');
    expect(sleep).toEqual({ category: 'sleep', enabled: false, preferredTime: '21:30' });

    // Other categories remain at their defaults.
    const water = getRes.json().preferences.find((p: { category: string }) => p.category === 'water');
    expect(water).toEqual({ category: 'water', enabled: true, preferredTime: null });
  });

  it('rejects a malformed preferredTime', async () => {
    const token = await registerAndGetToken(app, 'notif-invalid');

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/notification-preferences',
      headers: { authorization: `Bearer ${token}` },
      payload: { category: 'water', enabled: true, preferredTime: '9:30am' },
    });
    expect(response.statusCode).toBe(400);
  });
});
