import {
  CreateNotificationPreferenceRequestSchema,
  RegisterPushTokenRequestSchema,
  NotificationPreferencesResponseSchema,
  UpdateNotificationPreferenceRequestSchema,
} from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import {
  createNotificationPreference,
  deleteNotificationPreference,
  getNotificationPreferences,
  updateNotificationPreference,
} from './notification-preferences.service';
import { registerPushToken, unregisterPushToken } from './push-token.service';

export async function notificationPreferencesRoutes(app: FastifyInstance) {
  app.get('/me/notification-preferences', { preHandler: app.authenticate }, async (request, reply) => {
    const result = await getNotificationPreferences(app.prisma, request.user.sub);
    reply.send(NotificationPreferencesResponseSchema.parse(result));
  });

  app.post('/me/notification-preferences', { preHandler: app.authenticate }, async (request, reply) => {
    const body = CreateNotificationPreferenceRequestSchema.parse(request.body);
    const result = await createNotificationPreference(app.prisma, request.user.sub, body);
    reply.code(201).send(NotificationPreferencesResponseSchema.parse(result));
  });

  // Reminders are addressed by row id rather than category: a user may hold
  // several of the same category, so the category no longer identifies one.
  app.patch<{ Params: { id: string } }>(
    '/me/notification-preferences/:id',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const body = UpdateNotificationPreferenceRequestSchema.parse(request.body);
      const result = await updateNotificationPreference(app.prisma, request.user.sub, request.params.id, body);
      reply.send(NotificationPreferencesResponseSchema.parse(result));
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/me/notification-preferences/:id',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const result = await deleteNotificationPreference(app.prisma, request.user.sub, request.params.id);
      reply.send(NotificationPreferencesResponseSchema.parse(result));
    },
  );

  // Registering a device is what moves reminder delivery from the phone's
  // local scheduler to the server, so it survives a reinstall or a new phone.
  app.post('/me/push-tokens', { preHandler: app.authenticate }, async (request, reply) => {
    const body = RegisterPushTokenRequestSchema.parse(request.body);
    await registerPushToken(app.prisma, request.user.sub, body);
    reply.code(204).send();
  });

  app.delete<{ Params: { token: string } }>(
    '/me/push-tokens/:token',
    { preHandler: app.authenticate },
    async (request, reply) => {
      await unregisterPushToken(app.prisma, request.user.sub, decodeURIComponent(request.params.token));
      reply.code(204).send();
    },
  );
}
