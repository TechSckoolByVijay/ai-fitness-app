import { DashboardHistorySchema, DashboardTodaySchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDashboardHistory, getTodayDashboard } from './dashboard.service';

const HistoryQuerySchema = z.object({
  days: z.coerce.number().int().min(2).max(90).optional().default(14),
});

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard/today', { preHandler: app.authenticate }, async (request, reply) => {
    const dashboard = await getTodayDashboard(app.prisma, request.user.sub);
    reply.send(DashboardTodaySchema.parse(dashboard));
  });

  app.get('/dashboard/history', { preHandler: app.authenticate }, async (request, reply) => {
    const { days } = HistoryQuerySchema.parse(request.query);
    const history = await getDashboardHistory(app.prisma, request.user.sub, days);
    reply.send(DashboardHistorySchema.parse(history));
  });
}
