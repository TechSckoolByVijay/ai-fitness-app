import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildCoachContext } from '../../src/modules/coach/coach-context.service';
import { createTestApp, uniqueEmail } from './helpers';

async function registerAndGetToken(app: FastifyInstance, prefix: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Coach Tester' },
  });
  return response.json().accessToken;
}

describe('coach chat', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('includes the user\'s reported health conditions in the Coach context (not just diet/allergies)', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: uniqueEmail('coach-health'), password: 'password123', name: 'Coach Tester' },
    });
    const { accessToken } = registerRes.json();

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/health-conditions',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { conditions: [{ type: 'diabetes' }, { type: 'prefer_not_to_answer' }] },
    });

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const userId = meRes.json().id;

    const context = await buildCoachContext(app.prisma, userId);
    // "prefer_not_to_answer" isn't an actual condition to reason about — excluded.
    expect(context.healthConditions).toEqual(['diabetes']);
  });

  it('returns no conversation before the user has sent a first message', async () => {
    const token = await registerAndGetToken(app, 'coach-empty');

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/coach/conversation',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().conversation).toBeNull();
  });

  it('suggests a dish, persists both messages, and continues the same conversation on GET', async () => {
    const token = await registerAndGetToken(app, 'coach-suggest');

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/diet',
      headers: { authorization: `Bearer ${token}` },
      payload: { dietType: 'vegetarian' },
    });

    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/v1/coach/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'I want to prepare a dish for evening snacks with peanuts.' },
    });

    expect(sendRes.statusCode).toBe(200);
    const body = sendRes.json();
    expect(body.userMessage.role).toBe('user');
    expect(body.assistantMessage.role).toBe('assistant');
    expect(body.assistantMessage.content.toLowerCase()).toContain('peanut');
    expect(body.assistantMessage.content.toLowerCase()).not.toContain('chicken');

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/coach/conversation',
      headers: { authorization: `Bearer ${token}` },
    });
    const conversation = getRes.json().conversation;
    expect(conversation.id).toBe(body.conversationId);
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0].role).toBe('user');
    expect(conversation.messages[1].role).toBe('assistant');
  });

  it('never suggests a dish that conflicts with a listed allergy', async () => {
    const token = await registerAndGetToken(app, 'coach-allergy');

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/diet',
      headers: { authorization: `Bearer ${token}` },
      payload: { dietType: 'vegetarian' },
    });
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/allergies',
      headers: { authorization: `Bearer ${token}` },
      payload: { allergies: [{ type: 'peanuts' }] },
    });

    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/v1/coach/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'suggest a dish with peanuts for me' },
    });

    const content = sendRes.json().assistantMessage.content.toLowerCase();
    expect(content).not.toContain('peanut chikki');
    expect(content).not.toContain('roasted peanut chaat');
  });

  it('gives step-by-step recipe instructions on a follow-up request', async () => {
    const token = await registerAndGetToken(app, 'coach-recipe');

    await app.inject({
      method: 'POST',
      url: '/api/v1/coach/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'suggest a snack for me' },
    });

    const recipeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/coach/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'can you give me the recipe for that?' },
    });

    expect(recipeRes.statusCode).toBe(200);
    const content = recipeRes.json().assistantMessage.content;
    expect(content).toMatch(/1\./);
    expect(content).toMatch(/2\./);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/coach/conversation',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getRes.json().conversation.messages).toHaveLength(4);
  });

  it('rejects an empty message', async () => {
    const token = await registerAndGetToken(app, 'coach-invalid');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/coach/messages',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: '' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/coach/messages',
      payload: { message: 'hi' },
    });
    expect(response.statusCode).toBe(401);
  });
});
