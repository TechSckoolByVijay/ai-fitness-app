import { DashboardTodaySchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { getTodayDashboard } from './dashboard.service';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard/today', { preHandler: app.authenticate }, async (request, reply) => {
    const dashboard = await getTodayDashboard(app.prisma, request.user.sub);
    reply.send(DashboardTodaySchema.parse(dashboard));
  });
}
