import {
  MeResponseSchema,
  UpdateAllergiesRequestSchema,
  UpdateDietRequestSchema,
  UpdateGoalsRequestSchema,
  UpdateHealthConditionsRequestSchema,
} from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import {
  completeOnboarding,
  updateAllergies,
  updateDiet,
  updateGoals,
  updateHealthConditions,
} from './onboarding.service';

export async function onboardingRoutes(app: FastifyInstance) {
  app.patch('/me/goals', { preHandler: app.authenticate }, async (request, reply) => {
    const body = UpdateGoalsRequestSchema.parse(request.body);
    const me = await updateGoals(app.prisma, request.user.sub, body);
    reply.send(MeResponseSchema.parse(me));
  });

  app.patch('/me/diet', { preHandler: app.authenticate }, async (request, reply) => {
    const body = UpdateDietRequestSchema.parse(request.body);
    const me = await updateDiet(app.prisma, request.user.sub, body);
    reply.send(MeResponseSchema.parse(me));
  });

  app.patch('/me/allergies', { preHandler: app.authenticate }, async (request, reply) => {
    const body = UpdateAllergiesRequestSchema.parse(request.body);
    const me = await updateAllergies(app.prisma, request.user.sub, body);
    reply.send(MeResponseSchema.parse(me));
  });

  app.patch('/me/health-conditions', { preHandler: app.authenticate }, async (request, reply) => {
    const body = UpdateHealthConditionsRequestSchema.parse(request.body);
    const me = await updateHealthConditions(app.prisma, request.user.sub, body);
    reply.send(MeResponseSchema.parse(me));
  });

  app.post('/me/onboarding/complete', { preHandler: app.authenticate }, async (request, reply) => {
    const me = await completeOnboarding(app.prisma, request.user.sub);
    reply.send(MeResponseSchema.parse(me));
  });
}
