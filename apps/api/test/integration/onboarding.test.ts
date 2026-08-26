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
