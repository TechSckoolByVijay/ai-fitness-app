import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from './helpers';

async function registerAndGetToken(app: FastifyInstance, prefix: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Onboarding Tester' },
  });
  return response.json().accessToken;
}

async function setBaseProfile(app: FastifyInstance, token: string, overrides: Record<string, unknown> = {}) {
  return app.inject({
    method: 'PATCH',
    url: '/api/v1/me/profile',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      dateOfBirth: '1995-06-15',
      heightCm: 170,
      currentWeightKg: 70,
      activityLevel: 'moderate',
      sex: 'male',
      ...overrides,
    },
  });
}

describe('editing onboarding answers after completion', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('computes targets on onboarding completion, then keeps them updated as body info changes', async () => {
    const token = await registerAndGetToken(app, 'edit-body');
    const auth = { authorization: `Bearer ${token}` };

    await setBaseProfile(app, token);
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/goals',
      headers: auth,
      payload: { primaryGoal: 'maintain_weight' },
    });
    await app.inject({ method: 'POST', url: '/api/v1/me/onboarding/complete', headers: auth });

    const initial = await app.inject({ method: 'GET', url: '/api/v1/me', headers: auth });
    const initialCalorieTarget = initial.json().profile.calorieTarget;
    expect(initialCalorieTarget).toBeGreaterThan(0);

    // Editing body info well after onboarding should recompute targets, not leave them stale.
    const editRes = await setBaseProfile(app, token, { currentWeightKg: 90, activityLevel: 'very_active' });
    expect(editRes.statusCode).toBe(200);
    expect(editRes.json().profile.currentWeightKg).toBe(90);
    expect(editRes.json().profile.calorieTarget).not.toBe(initialCalorieTarget);

    const after = await app.inject({ method: 'GET', url: '/api/v1/me', headers: auth });
    expect(after.json().profile.currentWeightKg).toBe(90);
  });

  it('recomputes calorie target when the primary goal changes', async () => {
    const token = await registerAndGetToken(app, 'edit-goal');
    const auth = { authorization: `Bearer ${token}` };

    await setBaseProfile(app, token);
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/goals',
      headers: auth,
      payload: { primaryGoal: 'maintain_weight' },
    });
    await app.inject({ method: 'POST', url: '/api/v1/me/onboarding/complete', headers: auth });

    const maintain = await app.inject({ method: 'GET', url: '/api/v1/me', headers: auth });
    const maintainTarget = maintain.json().profile.calorieTarget;

    const changeGoalRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/goals',
      headers: auth,
      payload: { primaryGoal: 'lose_weight' },
    });
    expect(changeGoalRes.json().profile.calorieTarget).toBeLessThan(maintainTarget);
    expect(changeGoalRes.json().goals.find((g: { isPrimary: boolean }) => g.isPrimary).type).toBe('lose_weight');
  });

  it('allows updating diet, allergies, and health conditions independently after onboarding', async () => {
    const token = await registerAndGetToken(app, 'edit-diet-allergy');
    const auth = { authorization: `Bearer ${token}` };

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/diet',
      headers: auth,
      payload: { dietType: 'non_vegetarian' },
    });

    const switchToVeg = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/diet',
      headers: auth,
      payload: { dietType: 'vegetarian' },
    });
    expect(switchToVeg.json().dietPreference).toEqual({ dietType: 'vegetarian', otherText: null });

    const addAllergy = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/allergies',
      headers: auth,
      payload: { allergies: [{ type: 'peanuts' }] },
    });
    expect(addAllergy.json().allergies).toEqual([{ type: 'peanuts', otherText: null }]);

    const clearAllergy = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/allergies',
      headers: auth,
      payload: { allergies: [] },
    });
    expect(clearAllergy.json().allergies).toEqual([]);

    const addCondition = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/health-conditions',
      headers: auth,
      payload: { conditions: [{ type: 'diabetes' }] },
    });
    expect(addCondition.json().healthConditions).toEqual([{ type: 'diabetes', otherText: null }]);
  });
});

describe('unit system preference', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('defaults to metric and round-trips a switch to imperial', async () => {
    const token = await registerAndGetToken(app, 'units-pref');

    const before = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(before.json().profile.unitSystem).toBe('metric');

    const patched = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { unitSystem: 'imperial' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().profile.unitSystem).toBe('imperial');
  });

  it('never converts stored measurements when the display unit changes', async () => {
    const token = await registerAndGetToken(app, 'units-storage');

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { heightCm: 170, currentWeightKg: 70.5 },
    });

    const after = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { unitSystem: 'imperial' },
    });

    // Storage stays metric — imperial is a display concern only.
    expect(after.json().profile.heightCm).toBe(170);
    expect(after.json().profile.currentWeightKg).toBe(70.5);
  });
});

describe('custom calorie budget', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const MACROS = { carbPct: 40, fatPct: 30, proteinPct: 30 };

  async function onboard(token: string) {
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        dateOfBirth: '1995-06-15',
        sex: 'male',
        heightCm: 175,
        currentWeightKg: 75,
        activityLevel: 'moderate',
      },
    });
  }

  it('refuses a target below the 1200 kcal floor', async () => {
    const token = await registerAndGetToken(app, 'budget-floor');

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/budget',
      headers: { authorization: `Bearer ${token}` },
      payload: { mode: 'custom', calorieTarget: 800, macros: MACROS },
    });
    expect(response.statusCode).toBe(400);
  });

  it('rejects a macro split that does not add up to 100', async () => {
    const token = await registerAndGetToken(app, 'budget-macros');

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/budget',
      headers: { authorization: `Bearer ${token}` },
      payload: { mode: 'custom', calorieTarget: 2000, macros: { carbPct: 50, fatPct: 30, proteinPct: 30 } },
    });
    expect(response.statusCode).toBe(400);
  });

  it('derives the protein target from the macro split', async () => {
    const token = await registerAndGetToken(app, 'budget-protein');
    await onboard(token);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/budget',
      headers: { authorization: `Bearer ${token}` },
      payload: { mode: 'custom', calorieTarget: 2000, macros: MACROS },
    });
    // 30% of 2000 kcal = 600 kcal of protein at 4 kcal/g = 150g.
    expect(response.json().profile.proteinTarget).toBe(150);
    expect(response.json().profile.useCustomTargets).toBe(true);
  });

  it('does not let a new weight log silently overwrite a custom budget', async () => {
    const token = await registerAndGetToken(app, 'budget-persist');
    await onboard(token);

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/budget',
      headers: { authorization: `Bearer ${token}` },
      payload: { mode: 'custom', calorieTarget: 1800, macros: MACROS },
    });

    // Logging a weight recalculates targets — the whole reason useCustomTargets exists.
    await app.inject({
      method: 'POST',
      url: '/api/v1/weight-entries',
      headers: { authorization: `Bearer ${token}` },
      payload: { weightKg: 80, loggedAt: new Date().toISOString() },
    });

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.json().profile.calorieTarget).toBe(1800);
  });

  it('hands the target back to the calculator when switched to standard', async () => {
    const token = await registerAndGetToken(app, 'budget-standard');
    await onboard(token);

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/budget',
      headers: { authorization: `Bearer ${token}` },
      payload: { mode: 'custom', calorieTarget: 1800, macros: MACROS },
    });

    const restored = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/budget',
      headers: { authorization: `Bearer ${token}` },
      payload: { mode: 'standard' },
    });

    expect(restored.json().profile.useCustomTargets).toBe(false);
    // Recalculated from the profile, so no longer the hand-set 1800.
    expect(restored.json().profile.calorieTarget).not.toBe(1800);
    expect(restored.json().profile.calorieTarget).toBeGreaterThan(1200);
  });
});
