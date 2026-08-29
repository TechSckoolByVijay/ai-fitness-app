import { buildApp } from './app';
import { loadEnv } from './config/env';
import { startReminderScheduler } from './modules/notifications/reminder-scheduler';
import { ExpoPushProvider } from './providers/push/expo-push.provider';

async function main() {
  const env = loadEnv();
  const app = await buildApp(env);

  // Must happen BEFORE listen(): Fastify refuses addHook once the instance
  // has started, and doing this afterwards crashed the container on boot.
  if (env.ENABLE_REMINDER_SCHEDULER) {
    // Runs in the API process rather than as a separate worker: at this
    // app's scale a second deployable is not worth the operational cost, and
    // the per-reminder claim in runReminderTick already makes it safe for
    // more than one replica to tick concurrently.
    const stop = startReminderScheduler({
      prisma: app.prisma,
      push: new ExpoPushProvider(),
      log: (message, meta) => app.log.info(meta ?? {}, message),
    });
    app.addHook('onClose', async () => stop());
  }

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(
      `Fitness Coach API ready (env: ${env.NODE_ENV}, reminder scheduler: ${env.ENABLE_REMINDER_SCHEDULER ? 'on' : 'off'})`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
