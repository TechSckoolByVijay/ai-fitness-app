import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, uniqueEmail } from './helpers';

async function registerAndGetToken(app: FastifyInstance, prefix: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Export Tester' },
  });
  return response.json().accessToken;
}

function parseCsv(body: string): Array<Record<string, string>> {
  const [header, ...lines] = body.replace(/^﻿/, '').trim().split('\r\n');
  const columns = header.split(',');
  // Test rows avoid commas inside values, so a plain split is enough here.
  return lines.map((line) => Object.fromEntries(line.split(',').map((v, i) => [columns[i], v])));
}

const today = new Date().toISOString().slice(0, 10);

describe('data export', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/export/food.csv?days=7' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects a range over a year, and a request with no range', async () => {
    const token = await registerAndGetToken(app, 'export-range');
    const headers = { authorization: `Bearer ${token}` };

    const tooLong = await app.inject({ method: 'GET', url: '/api/v1/export/days.csv?days=400', headers });
    expect(tooLong.statusCode).toBe(400);

    const none = await app.inject({ method: 'GET', url: '/api/v1/export/days.csv', headers });
    expect(none.statusCode).toBe(400);
  });

  it('exports food items with protein, edits and whole-day entries, and only the caller’s own', async () => {
    const token = await registerAndGetToken(app, 'export-food');
    const headers = { authorization: `Bearer ${token}` };
    const otherToken = await registerAndGetToken(app, 'export-other');

    await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers,
      payload: {
        mealType: 'lunch',
        loggedAt: `${today}T07:30:00.000Z`,
        timePrecision: 'approximate',
        sourceText: 'dal with extra paneer',
        items: [
          {
            name: 'dal',
            quantity: 1,
            unit: 'bowl',
            confidence: 0.9,
            nutrition: {
              calories: 250,
              proteinG: 22,
              carbsG: 30,
              fatG: 6,
              fiberG: 5,
              isEstimate: true,
              source: 'user_edited',
              estimatedCalories: 250,
              estimatedProteinG: 12,
              proteinSetByUser: true,
            },
          },
        ],
      },
    });

    // Whole-day totals: any clock time sent is replaced by the day placeholder.
    const allDay = await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers,
      payload: {
        mealType: 'all_day',
        loggedAt: `${today}T03:17:00.000Z`,
        timePrecision: 'day',
        items: [
          {
            name: 'tea',
            quantity: 4,
            unit: 'cup',
            confidence: 0.9,
            nutrition: { calories: 160, proteinG: 4, carbsG: 20, fatG: 6, fiberG: 0, isEstimate: true, source: 'mock' },
          },
        ],
      },
    });
    expect(allDay.statusCode).toBe(201);
    expect(allDay.json()).toMatchObject({ timePrecision: 'day', loggedAt: `${today}T12:00:00.000Z` });

    await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers: { authorization: `Bearer ${otherToken}` },
      payload: {
        mealType: 'dinner',
        loggedAt: `${today}T14:00:00.000Z`,
        items: [
          {
            name: 'someone elses pizza',
            quantity: 1,
            unit: 'slice',
            confidence: 0.9,
            nutrition: { calories: 300, proteinG: 12, carbsG: 30, fatG: 12, fiberG: 2, isEstimate: true, source: 'mock' },
          },
        ],
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/v1/export/food.csv?days=1&tz=UTC', headers });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="fitness-food-log-');

    const rows = parseCsv(res.body);
    expect(rows.map((r) => r.food)).toEqual(['dal', 'tea']);
    expect(rows[0]).toMatchObject({
      time: '07:30',
      meal: 'Lunch',
      protein_g: '22',
      edited_by_user: 'yes',
      estimated_protein_g: '12',
    });
    expect(rows[1]).toMatchObject({ time: '', time_precision: 'day', meal: 'Through the day' });
  });

  it('round-trips the protein correction through the entries API', async () => {
    const token = await registerAndGetToken(app, 'export-roundtrip');
    const headers = { authorization: `Bearer ${token}` };
    await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers,
      payload: {
        mealType: 'breakfast',
        loggedAt: `${today}T03:00:00.000Z`,
        items: [
          {
            name: 'eggs',
            quantity: 2,
            unit: 'whole',
            confidence: 0.9,
            nutrition: {
              calories: 150,
              proteinG: 14,
              carbsG: 1,
              fatG: 10,
              fiberG: 0,
              isEstimate: true,
              source: 'user_edited',
              estimatedCalories: 140,
              estimatedProteinG: 12,
              proteinSetByUser: true,
            },
          },
        ],
      },
    });

    const list = await app.inject({ method: 'GET', url: '/api/v1/food/entries', headers });
    expect(list.json().entries[0].items[0].nutrition).toMatchObject({
      proteinG: 14,
      estimatedCalories: 140,
      estimatedProteinG: 12,
      proteinSetByUser: true,
    });
    expect(list.json().entries[0].timePrecision).toBe('approximate');
  });

  it('exports one row per day, with empty days, targets and water', async () => {
    const token = await registerAndGetToken(app, 'export-days');
    const headers = { authorization: `Bearer ${token}` };

    await app.inject({
      method: 'POST',
      url: '/api/v1/water/entries',
      headers,
      payload: { amountMl: 750, loggedAt: `${today}T05:00:00.000Z` },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/food/entries',
      headers,
      payload: {
        mealType: 'lunch',
        loggedAt: `${today}T08:00:00.000Z`,
        items: [
          {
            name: 'rice',
            quantity: 1,
            unit: 'bowl',
            confidence: 0.9,
            nutrition: { calories: 400, proteinG: 8, carbsG: 80, fatG: 2, fiberG: 1, isEstimate: true, source: 'mock' },
          },
        ],
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/v1/export/days.csv?days=3&tz=UTC', headers });
    expect(res.statusCode).toBe(200);
    const rows = parseCsv(res.body);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ logged: 'no', calories_in: '', water_ml: '0' });
    expect(rows[2]).toMatchObject({
      date: today,
      logged: 'yes',
      meals_logged: '1',
      calories_in: '400',
      protein_g: '8',
      water_ml: '750',
    });
  });
});
