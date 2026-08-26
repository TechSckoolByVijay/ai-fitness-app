import {
  NotificationPreferencesResponseSchema,
  UpdateNotificationPreferenceRequestSchema,
} from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { getNotificationPreferences, updateNotificationPreference } from './notification-preferences.service';

export async function notificationPreferencesRoutes(app: FastifyInstance) {
  app.get('/me/notification-preferences', { preHandler: app.authenticate }, async (request, reply) => {
    const result = await getNotificationPreferences(app.prisma, request.user.sub);
    reply.send(NotificationPreferencesResponseSchema.parse(result));
  });

  app.patch('/me/notification-preferences', { preHandler: app.authenticate }, async (request, reply) => {
    const body = UpdateNotificationPreferenceRequestSchema.parse(request.body);
    const result = await updateNotificationPreference(app.prisma, request.user.sub, body);
    reply.send(NotificationPreferencesResponseSchema.parse(result));
  });
}
