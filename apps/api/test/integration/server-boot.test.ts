import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { loadEnv } from '../../src/config/env';
import { startReminderScheduler } from '../../src/modules/notifications/reminder-scheduler';
import { ExpoPushProvider } from '../../src/providers/push/expo-push.provider';

/**
 * Boots the server the way production does — actually calling listen().
 *
 * Every other integration test uses app.inject(), which never starts the
 * HTTP server. That gap let a real crash ship: the scheduler's onClose hook
 * was registered after listen(), which Fastify rejects outright
 * ("Fastify instance is already listening. Cannot call addHook!"), so the
 * container exited on boot while every test still passed.
 *
 * Port 0 asks the OS for any free port, so this never collides with a dev
 * server or another test run.
 */
describe('server boot', () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;
  });

  it('starts and serves with the reminder scheduler enabled', async () => {
    const env = { ...loadEnv(), ENABLE_REMINDER_SCHEDULER: true };
    app = await buildApp(env);

    // Mirrors src/server.ts exactly — hooks before listen.
    const stop = startReminderScheduler({ prisma: app.prisma, push: new ExpoPushProvider() });
    app.addHook('onClose', async () => stop());

    await expect(app.listen({ port: 0, host: '127.0.0.1' })).resolves.toBeTypeOf('string');

    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('starts with the scheduler disabled', async () => {
    const env = { ...loadEnv(), ENABLE_REMINDER_SCHEDULER: false };
    app = await buildApp(env);

    await expect(app.listen({ port: 0, host: '127.0.0.1' })).resolves.toBeTypeOf('string');
  });
});
