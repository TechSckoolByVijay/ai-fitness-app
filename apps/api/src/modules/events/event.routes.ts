import { EventInterpretRequestSchema, EventInterpretResponseSchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { DEFAULT_WEIGHT_KG } from '../exercise/calorie-burn';
import { interpretHealthEvent } from './event.service';

export async function eventRoutes(app: FastifyInstance) {
  app.post('/events/interpret', { preHandler: app.authenticate }, async (request, reply) => {
    const body = EventInterpretRequestSchema.parse(request.body);

    const profile = await app.prisma.profile.findUnique({ where: { userId: request.user.sub } });
    const weightKg = profile?.currentWeightKg ? Number(profile.currentWeightKg) : DEFAULT_WEIGHT_KG;

    const event = await interpretHealthEvent(
      {
        aiProvider: app.aiProvider,
        speechProvider: app.speechProvider,
        nutritionService: app.nutritionService,
      },
      weightKg,
      body,
    );

    reply.send(EventInterpretResponseSchema.parse({ event }));
  });
}
