import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runReminderTick } from '../../src/modules/notifications/reminder-scheduler';
import type { ExpoPushProvider, PushMessage, PushResult } from '../../src/providers/push/expo-push.provider';
import { createTestApp, uniqueEmail } from './helpers';

async function registerAndGetToken(app: FastifyInstance, prefix: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: uniqueEmail(prefix), password: 'password123', name: 'Push Tester' },
  });
  return response.json().accessToken;
}

/** Records what would have been sent instead of calling Expo. */
class FakePush {
  sentBatches: PushMessage[][] = [];
  invalidTokens: string[] = [];

  async send(messages: PushMessage[]): Promise<PushResult> {
    this.sentBatches.push(messages);
    return { invalidTokens: this.invalidTokens, sent: messages.length - this.invalidTokens.length };
  }

  get allSent(): PushMessage[] {
    return this.sentBatches.flat();
  }
}

describe('server-sent reminders', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  /** 21:00 in Asia/Kolkata. */
  const AT_9PM_IST = new Date('2026-08-29T15:30:00Z');

  async function setupUser(name: string, token: string) {
    const jwt = await registerAndGetToken(app, name);

    await app.inject({
      method: 'POST',
      url: '/api/v1/me/push-tokens',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { token, platform: 'android', timeZone: 'Asia/Kolkata' },
    });

    const prefs = await app.inject({
      method: 'GET',
      url: '/api/v1/me/notification-preferences',
      headers: { authorization: `Bearer ${jwt}` },
    });
    const sleep = prefs.json().preferences.find((p: { category: string }) => p.category === 'sleep');

    // Point the bedtime reminder at 21:00 and disable the rest, so this test
    // asserts on exactly one reminder.
    for (const pref of prefs.json().preferences) {
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/me/notification-preferences/${pref.id}`,
        headers: { authorization: `Bearer ${jwt}` },
        payload: pref.id === sleep.id ? { enabled: true, preferredTime: '21:00' } : { enabled: false },
      });
    }

    return { jwt, sleepId: sleep.id as string };
  }

  it('sends a reminder at the user local time, not the server clock', async () => {
    const token = 'ExponentPushToken[local-time]';
    await setupUser('push-localtime', token);
    const push = new FakePush();

    // 21:00 UTC is 02:30 the next day in Kolkata — must not fire.
    await runReminderTick({ prisma: app.prisma, push: push as unknown as ExpoPushProvider }, new Date('2026-08-29T21:00:00Z'));
    expect(push.allSent.filter((m) => m.token === token)).toHaveLength(0);

    await runReminderTick({ prisma: app.prisma, push: push as unknown as ExpoPushProvider }, AT_9PM_IST);
    const mine = push.allSent.filter((m) => m.token === token);
    expect(mine).toHaveLength(1);
    expect(mine[0].title).toContain('Wind down');
  });

  it('does not send the same reminder twice on the same local day', async () => {
    const token = 'ExponentPushToken[once-a-day]';
    await setupUser('push-once', token);
    const push = new FakePush();

    await runReminderTick({ prisma: app.prisma, push: push as unknown as ExpoPushProvider }, AT_9PM_IST);
    // A second tick a minute later is still inside the grace window.
    await runReminderTick(
      { prisma: app.prisma, push: push as unknown as ExpoPushProvider },
      new Date('2026-08-29T15:31:00Z'),
    );

    expect(push.allSent.filter((m) => m.token === token)).toHaveLength(1);
  });

  it('sends again the next day', async () => {
    const token = 'ExponentPushToken[next-day]';
    await setupUser('push-nextday', token);
    const push = new FakePush();

    await runReminderTick({ prisma: app.prisma, push: push as unknown as ExpoPushProvider }, AT_9PM_IST);
    await runReminderTick(
      { prisma: app.prisma, push: push as unknown as ExpoPushProvider },
      new Date('2026-08-30T15:30:00Z'),
    );

    expect(push.allSent.filter((m) => m.token === token)).toHaveLength(2);
  });

  it('delivers to every device a user has registered', async () => {
    const first = 'ExponentPushToken[device-one]';
    const { jwt } = await setupUser('push-multidevice', first);

    const second = 'ExponentPushToken[device-two]';
    await app.inject({
      method: 'POST',
      url: '/api/v1/me/push-tokens',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { token: second, platform: 'ios', timeZone: 'Asia/Kolkata' },
    });

    const push = new FakePush();
    await runReminderTick({ prisma: app.prisma, push: push as unknown as ExpoPushProvider }, AT_9PM_IST);

    const tokens = push.allSent.map((m) => m.token);
    expect(tokens).toContain(first);
    expect(tokens).toContain(second);
  });

  it('prunes a token Expo reports as no longer registered', async () => {
    const token = 'ExponentPushToken[uninstalled]';
    await setupUser('push-prune', token);

    const push = new FakePush();
    push.invalidTokens = [token];
    await runReminderTick({ prisma: app.prisma, push: push as unknown as ExpoPushProvider }, AT_9PM_IST);

    // Otherwise the token list grows forever with dead devices.
    const remaining = await app.prisma.pushToken.findMany({ where: { token } });
    expect(remaining).toHaveLength(0);
  });

  it('does not send for a disabled reminder', async () => {
    const token = 'ExponentPushToken[disabled]';
    const { jwt, sleepId } = await setupUser('push-disabled', token);

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/me/notification-preferences/${sleepId}`,
      headers: { authorization: `Bearer ${jwt}` },
      payload: { enabled: false },
    });

    const push = new FakePush();
    await runReminderTick({ prisma: app.prisma, push: push as unknown as ExpoPushProvider }, AT_9PM_IST);
    expect(push.allSent.filter((m) => m.token === token)).toHaveLength(0);
  });

  it('uses the user own wording for a reminder they added', async () => {
    const token = 'ExponentPushToken[custom-label]';
    const { jwt } = await setupUser('push-custom', token);

    await app.inject({
      method: 'POST',
      url: '/api/v1/me/notification-preferences',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { category: 'meal_suggestion', label: 'Lunch', preferredTime: '21:00' },
    });

    const push = new FakePush();
    await runReminderTick({ prisma: app.prisma, push: push as unknown as ExpoPushProvider }, AT_9PM_IST);

    const titles = push.allSent.filter((m) => m.token === token).map((m) => m.title);
    expect(titles).toContain('Lunch');
  });

  it('re-points a token to its new owner rather than notifying the old one', async () => {
    const shared = 'ExponentPushToken[shared-device]';
    await setupUser('push-owner-a', shared);
    const { jwt: second } = await setupUser('push-owner-b', 'ExponentPushToken[owner-b-initial]');

    await app.inject({
      method: 'POST',
      url: '/api/v1/me/push-tokens',
      headers: { authorization: `Bearer ${second}` },
      payload: { token: shared, platform: 'android', timeZone: 'Asia/Kolkata' },
    });

    const rows = await app.prisma.pushToken.findMany({ where: { token: shared } });
    expect(rows).toHaveLength(1);

    const me = await app.inject({ method: 'GET', url: '/api/v1/me', headers: { authorization: `Bearer ${second}` } });
    expect(rows[0].userId).toBe(me.json().id);
  });

  it('lets a user remove their own token but not someone else token', async () => {
    const mine = 'ExponentPushToken[mine]';
    const { jwt } = await setupUser('push-delete-mine', mine);
    const theirs = 'ExponentPushToken[theirs]';
    await setupUser('push-delete-theirs', theirs);

    const other = await app.inject({
      method: 'DELETE',
      url: `/api/v1/me/push-tokens/${encodeURIComponent(theirs)}`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(other.statusCode).toBe(204);
    expect(await app.prisma.pushToken.findMany({ where: { token: theirs } })).toHaveLength(1);

    await app.inject({
      method: 'DELETE',
      url: `/api/v1/me/push-tokens/${encodeURIComponent(mine)}`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(await app.prisma.pushToken.findMany({ where: { token: mine } })).toHaveLength(0);
  });
});
