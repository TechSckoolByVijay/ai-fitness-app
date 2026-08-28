import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { Env } from './config/env';
import { getLoggerOptions } from './lib/logger';
import { authRoutes } from './modules/auth/auth.routes';
import { coachRoutes } from './modules/coach/coach.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { eventRoutes } from './modules/events/event.routes';
import { exerciseRoutes } from './modules/exercise/exercise.routes';
import { favoritesRoutes } from './modules/favorites/favorites.routes';
import { foodRoutes } from './modules/food/food.routes';
import { frequentMealsRoutes } from './modules/frequent-meals/frequent-meals.routes';
import { insightsRoutes } from './modules/insights/insights.routes';
import { legalRoutes } from './modules/legal/legal.routes';
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
  // Default 1MB is too small for a base64-encoded meal/label photo
  // (JPEG + ~33% base64 overhead can land well past that even at modest
  // compression) — 8MB covers a real photo with headroom while still
  // bounding request size against abuse.
  const app = Fastify({ logger: getLoggerOptions(env), bodyLimit: 8 * 1024 * 1024 });

  app.decorate('env', env);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: true });
  await app.register(sensible);
  // Global per-IP ceiling — generous enough for normal app usage, a
  // backstop against a runaway client or scripted abuse. Auth routes get a
  // much stricter override (see auth.routes.ts) since they're the highest-
  // value target once this is reachable from the public internet.
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    // Integration tests register many users per file from one "IP" and
    // would trip the strict auth limit; the limiter itself stays exercised
    // in dev/prod, where NODE_ENV is never 'test'.
    allowList: () => env.NODE_ENV === 'test',
  });
  await app.register(prismaPlugin);
  await app.register(authPlugin, { env });
  await app.register(providersPlugin, { env });

  // Auto-discovers every registered route (path + method always; full
  // request/response body shapes too, for any route whose `schema` option
  // uses a zod schema via fastify-type-provider-zod — existing routes that
  // still validate manually with `.parse()` inside the handler just show up
  // without a documented body shape, not as an error).
  if (env.NODE_ENV !== 'test') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Fitness Coach API',
          description: 'Voice-first AI fitness & nutrition coach — backend API.',
          version: '1.0.0',
        },
        servers: [{ url: `http://localhost:${env.PORT}` }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }

  registerErrorHandler(app);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(legalRoutes);

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
  await app.register(frequentMealsRoutes, { prefix: '/api/v1' });
  await app.register(insightsRoutes, { prefix: '/api/v1' });

  return app;
}
