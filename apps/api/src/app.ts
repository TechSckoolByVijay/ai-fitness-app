import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';
import type { Env } from './config/env';
import { getLoggerOptions } from './lib/logger';
import { authRoutes } from './modules/auth/auth.routes';
import { coachRoutes } from './modules/coach/coach.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { eventRoutes } from './modules/events/event.routes';
import { exerciseRoutes } from './modules/exercise/exercise.routes';
import { favoritesRoutes } from './modules/favorites/favorites.routes';
import { foodRoutes } from './modules/food/food.routes';
import { notificationPreferencesRoutes } from './modules/notifications/notification-preferences.routes';
import { onboardingRoutes } from './modules/onboarding/onboarding.routes';
import { sleepRoutes } from './modules/sleep/sleep.routes';
import { usersRoutes } from './modules/users/users.routes';
import { waterRoutes } from './modules/water/water.routes';
import { weightRoutes } from './modules/weight/weight.routes';
import { authPlugin } from './plugins/auth';
import { registerErrorHandler } from './plugins/error-handler';
import { prismaPlugin } from './plugins/prisma';
import { providersPlugin } from './plugins/providers';

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
  }
}

export async function buildApp(env: Env) {
  const app = Fastify({ logger: getLoggerOptions(env) });

  app.decorate('env', env);

  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(prismaPlugin);
  await app.register(authPlugin, { env });
  await app.register(providersPlugin, { env });

  registerErrorHandler(app);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(usersRoutes, { prefix: '/api/v1' });
  await app.register(onboardingRoutes, { prefix: '/api/v1' });
  await app.register(foodRoutes, { prefix: '/api/v1' });
  await app.register(exerciseRoutes, { prefix: '/api/v1' });
  await app.register(eventRoutes, { prefix: '/api/v1' });
  await app.register(dashboardRoutes, { prefix: '/api/v1' });
  await app.register(coachRoutes, { prefix: '/api/v1' });
  await app.register(waterRoutes, { prefix: '/api/v1' });
  await app.register(weightRoutes, { prefix: '/api/v1' });
  await app.register(sleepRoutes, { prefix: '/api/v1' });
  await app.register(notificationPreferencesRoutes, { prefix: '/api/v1' });
  await app.register(favoritesRoutes, { prefix: '/api/v1' });

  return app;
}
