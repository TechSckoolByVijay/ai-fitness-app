import { UpsertUserPreferenceRequestSchema, UserPreferencesResponseSchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import {
  deleteUserPreference,
  listUserPreferences,
  upsertUserPreference,
} from './user-preferences.service';

export async function userPreferencesRoutes(app: FastifyInstance) {
  app.get('/me/preferences', { preHandler: app.authenticate }, async (request, reply) => {
    const result = await listUserPreferences(app.prisma, request.user.sub);
    reply.send(UserPreferencesResponseSchema.parse(result));
  });

  app.put('/me/preferences', { preHandler: app.authenticate }, async (request, reply) => {
    const body = UpsertUserPreferenceRequestSchema.parse(request.body);
    const result = await upsertUserPreference(app.prisma, request.user.sub, body);
    reply.send(UserPreferencesResponseSchema.parse(result));
  });

  // Deleting returns the user to the standard tables — every remembered
  // value must be removable, or the app quietly gets something wrong forever.
  app.delete<{ Params: { id: string } }>(
    '/me/preferences/:id',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const result = await deleteUserPreference(app.prisma, request.user.sub, request.params.id);
      reply.send(UserPreferencesResponseSchema.parse(result));
    },
  );
}
