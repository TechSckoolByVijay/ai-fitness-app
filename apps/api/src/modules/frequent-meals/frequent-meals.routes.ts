import { FrequentMealsResponseSchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { listFrequentMeals } from './frequent-meals.service';

export async function frequentMealsRoutes(app: FastifyInstance) {
  app.get('/frequent-meals', { preHandler: app.authenticate }, async (request, reply) => {
    const result = await listFrequentMeals(app.prisma, request.user.sub);
    reply.send(FrequentMealsResponseSchema.parse(result));
  });
}
