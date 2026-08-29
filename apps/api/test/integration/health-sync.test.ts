import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from './helpers';

async function registerAndGetToken(app: FastifyInstance, prefix: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Health Tester' },
  });
  return response.json().accessToken;
}

describe('health data sync', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const today = new Date().toISOString().slice(0, 10);

  const sync = (token: string, days: unknown[]) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/health/sync',
      headers: { authorization: `Bearer ${token}` },
      payload: { provider: 'health_connect', days },
    });

  it('stores steps and surfaces them on the dashboard', async () => {
    const token = await registerAndGetToken(app, 'health-steps');

    const response = await sync(token, [{ date: today, steps: 8432, distanceMeters: 6100 }]);
    expect(response.statusCode).toBe(200);
    expect(response.json().daysStored).toBe(1);

    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashboard.json().steps).toBe(8432);
    // A target only appears once there is data to show it against.
    expect(dashboard.json().stepsTarget).toBe(10000);
  });

  it('marks the provider connected after a sync', async () => {
    const token = await registerAndGetToken(app, 'health-connected');
    await sync(token, [{ date: today, steps: 100 }]);

    const connections = await app.inject({
      method: 'GET',
      url: '/api/v1/health/connections',
      headers: { authorization: `Bearer ${token}` },
    });
    const hc = connections.json().connections.find((c: { provider: string }) => c.provider === 'health_connect');
    expect(hc.status).toBe('connected');
    expect(hc.lastSyncedAt).toBeTruthy();
  });

  it('replaces a day on re-sync rather than accumulating duplicates', async () => {
    const token = await registerAndGetToken(app, 'health-resync');

    await sync(token, [{ date: today, steps: 1000 }]);
    await sync(token, [{ date: today, steps: 4000 }]);

    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashboard.json().steps).toBe(4000);

    // A backfilling device re-sends the same day repeatedly; each metric
    // should exist once, not once per sync.
    const me = await app.inject({ method: 'GET', url: '/api/v1/me', headers: { authorization: `Bearer ${token}` } });
    const metrics = await app.prisma.healthMetric.findMany({
      where: { userId: me.json().id, type: 'steps' },
    });
    expect(metrics).toHaveLength(1);
  });

  it('does not let a food log wipe synced steps', async () => {
    const token = await registerAndGetToken(app, 'health-aggregation');
    await sync(token, [{ date: today, steps: 5000 }]);

    // The daily aggregation pass rewrites DailySummary from logged entries.
    // steps is deliberately not one of the fields it owns.
    await app.inject({
      method: 'POST',
      url: '/api/v1/water-entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { amountMl: 250, loggedAt: new Date().toISOString() },
    });

    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/today',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashboard.json().steps).toBe(5000);
  });

  it('accepts a multi-day backfill', async () => {
    const token = await registerAndGetToken(app, 'health-backfill');
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    const response = await sync(token, [
      { date: today, steps: 3000 },
      { date: yesterday, steps: 7000 },
    ]);
    expect(response.json().daysStored).toBe(2);
  });

  it('rejects impossible values rather than storing them', async () => {
    const token = await registerAndGetToken(app, 'health-invalid');

    expect((await sync(token, [{ date: today, steps: -5 }])).statusCode).toBe(400);
    expect((await sync(token, [{ date: '29-08-2026', steps: 100 }])).statusCode).toBe(400);
    expect((await sync(token, [])).statusCode).toBe(400);
  });

  it('lets a user disconnect', async () => {
    const token = await registerAndGetToken(app, 'health-disconnect');
    await sync(token, [{ date: today, steps: 100 }]);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/health/connections/health_connect',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(204);

    const connections = await app.inject({
      method: 'GET',
      url: '/api/v1/health/connections',
      headers: { authorization: `Bearer ${token}` },
    });
    const hc = connections.json().connections.find((c: { provider: string }) => c.provider === 'health_connect');
    expect(hc.status).toBe('disconnected');
    expect(hc.lastSyncedAt).toBeNull();
  });

  it('rejects an unknown provider', async () => {
    const token = await registerAndGetToken(app, 'health-unknown');
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/health/connections/fitbit',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(400);
  });
});
