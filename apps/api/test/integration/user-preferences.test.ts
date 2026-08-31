import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { calculateCaloriesBurned } from '../../src/modules/exercise/calorie-burn';
import { loadUserOverrides } from '../../src/modules/users/user-preferences.service';
import { findFoodEntry } from '../../src/providers/nutrition/food-table';
import { resolveGrams } from '../../src/providers/nutrition/resolve-grams';
import { createTestApp, uniqueEmail } from './helpers';

async function registerAndGetToken(app: FastifyInstance, prefix: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Prefs Tester' },
  });
  return response.json().accessToken;
}

describe('user preferences', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const put = (token: string, payload: Record<string, unknown>) =>
    app.inject({ method: 'PUT', url: '/api/v1/me/preferences', headers: { authorization: `Bearer ${token}` }, payload });

  const list = async (token: string) =>
    (
      await app.inject({ method: 'GET', url: '/api/v1/me/preferences', headers: { authorization: `Bearer ${token}` } })
    ).json().preferences;

  it('starts empty and stores a unit weight', async () => {
    const token = await registerAndGetToken(app, 'prefs-unit');
    expect(await list(token)).toHaveLength(0);

    const response = await put(token, { kind: 'unit_weight', key: 'scoop', grams: 35 });
    expect(response.statusCode).toBe(200);

    const prefs = await list(token);
    expect(prefs).toHaveLength(1);
    expect(prefs[0]).toMatchObject({ kind: 'unit_weight', key: 'scoop', grams: 35 });
  });

  it('replaces rather than accumulating when set twice', async () => {
    const token = await registerAndGetToken(app, 'prefs-replace');
    await put(token, { kind: 'unit_weight', key: 'scoop', grams: 35 });
    await put(token, { kind: 'unit_weight', key: 'scoop', grams: 40 });

    const prefs = await list(token);
    expect(prefs).toHaveLength(1);
    expect(prefs[0].grams).toBe(40);
  });

  it('matches the key however it was typed', async () => {
    const token = await registerAndGetToken(app, 'prefs-case');
    await put(token, { kind: 'unit_weight', key: '  Scoop ', grams: 35 });

    const me = await app.inject({ method: 'GET', url: '/api/v1/me', headers: { authorization: `Bearer ${token}` } });
    const overrides = await loadUserOverrides(app.prisma, me.json().id);
    expect(overrides.unitWeights.scoop).toBe(35);
  });

  it("uses the user's own weight over the standard table AND over the model's guess", async () => {
    const powder = findFoodEntry('protein powder');
    // Standard scoop is 32g.
    expect(resolveGrams(powder, 1, 'scoop')).toBe(32);

    // Their scoop wins.
    expect(resolveGrams(powder, 1, 'scoop', undefined, { scoop: 35 })).toBe(35);

    // And still wins when the vision model guessed a weight: they measured
    // it, the model did not.
    expect(resolveGrams(powder, 1, 'scoop', 100, { scoop: 35 })).toBe(35);
  });

  it('scales a stored unit weight by the quantity', async () => {
    expect(resolveGrams(undefined, 3, 'scoop', undefined, { scoop: 35 })).toBe(105);
  });

  it('rejects an implausible weight rather than poisoning every future entry', async () => {
    const token = await registerAndGetToken(app, 'prefs-bounds');
    // A preference is more dangerous than a one-off: it keeps being applied.
    expect((await put(token, { kind: 'unit_weight', key: 'scoop', grams: 5000 })).statusCode).toBe(400);
    expect((await put(token, { kind: 'unit_weight', key: 'scoop', grams: 0 })).statusCode).toBe(400);
  });

  it('applies an activity intensity multiplier to calories burned', async () => {
    const base = calculateCaloriesBurned({ activityType: 'gym_workout', durationMinutes: 30, weightKg: 70 });
    const harder = calculateCaloriesBurned({
      activityType: 'gym_workout',
      durationMinutes: 30,
      weightKg: 70,
      intensityMultiplier: 1.5,
    });

    expect(harder.caloriesBurned).toBeCloseTo(base.caloriesBurned * 1.5, 0);
  });

  it('clamps an absurd multiplier', async () => {
    const wild = calculateCaloriesBurned({
      activityType: 'gym_workout',
      durationMinutes: 30,
      weightKg: 70,
      intensityMultiplier: 99,
    });
    const capped = calculateCaloriesBurned({
      activityType: 'gym_workout',
      durationMinutes: 30,
      weightKg: 70,
      intensityMultiplier: 2,
    });
    expect(wild.caloriesBurned).toBe(capped.caloriesBurned);
  });

  it('rejects a multiplier outside the credible range at the API', async () => {
    const token = await registerAndGetToken(app, 'prefs-multiplier');
    expect((await put(token, { kind: 'activity_intensity', key: 'gym_workout', multiplier: 10 })).statusCode).toBe(400);
    expect((await put(token, { kind: 'activity_intensity', key: 'gym_workout', multiplier: 1.4 })).statusCode).toBe(200);
  });

  it('lets a preference be deleted, returning to the standard tables', async () => {
    const token = await registerAndGetToken(app, 'prefs-delete');
    await put(token, { kind: 'unit_weight', key: 'bowl', grams: 300 });
    const [pref] = await list(token);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/me/preferences/${pref.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().preferences).toHaveLength(0);
  });

  it("does not let one user read or delete another's preferences", async () => {
    const owner = await registerAndGetToken(app, 'prefs-owner');
    const stranger = await registerAndGetToken(app, 'prefs-stranger');
    await put(owner, { kind: 'unit_weight', key: 'scoop', grams: 35 });
    const [pref] = await list(owner);

    expect(await list(stranger)).toHaveLength(0);

    await app.inject({
      method: 'DELETE',
      url: `/api/v1/me/preferences/${pref.id}`,
      headers: { authorization: `Bearer ${stranger}` },
    });
    expect(await list(owner)).toHaveLength(1);
  });
});
