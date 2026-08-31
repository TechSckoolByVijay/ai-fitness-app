import { EventInterpretRequestSchema, EventInterpretResponseSchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { consumeAiQuota } from '../ai-quota/ai-quota.service';
import { DEFAULT_WEIGHT_KG } from '../exercise/calorie-burn';
import { loadUserOverrides } from '../users/user-preferences.service';
import { interpretHealthEvents } from './event.service';

export async function eventRoutes(app: FastifyInstance) {
  app.post('/events/interpret', { preHandler: app.authenticate }, async (request, reply) => {
    const body = EventInterpretRequestSchema.parse(request.body);

    await consumeAiQuota(app.prisma, request.user.sub, 'interpret', app.env.AI_DAILY_INTERPRET_LIMIT);

    const [profile, overrides] = await Promise.all([
      app.prisma.profile.findUnique({ where: { userId: request.user.sub } }),
      loadUserOverrides(app.prisma, request.user.sub),
    ]);
    const weightKg = profile?.currentWeightKg ? Number(profile.currentWeightKg) : DEFAULT_WEIGHT_KG;

    const events = await interpretHealthEvents(
      {
        aiProvider: app.aiProvider,
        speechProvider: app.speechProvider,
        nutritionService: app.nutritionService,
      },
      weightKg,
      body,
      overrides,
    );

    reply.send(EventInterpretResponseSchema.parse({ events }));
  });
}
