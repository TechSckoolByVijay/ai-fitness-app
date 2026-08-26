import { InsightsResponseSchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { getTodayInsights } from './insights.service';

export async function insightsRoutes(app: FastifyInstance) {
  app.get('/insights/today', { preHandler: app.authenticate }, async (request, reply) => {
    const insights = await getTodayInsights(app.prisma, request.user.sub);
    reply.send(InsightsResponseSchema.parse(insights));
  });
}
