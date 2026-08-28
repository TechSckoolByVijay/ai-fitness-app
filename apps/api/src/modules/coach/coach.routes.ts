import {
  CoachConversationResponseSchema,
  SendCoachMessageRequestSchema,
  SendCoachMessageResponseSchema,
} from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { clearConversation, getCurrentConversation, sendCoachMessage } from './coach-chat.service';

export async function coachRoutes(app: FastifyInstance) {
  app.get('/coach/conversation', { preHandler: app.authenticate }, async (request, reply) => {
    const conversation = await getCurrentConversation(app.prisma, request.user.sub);
    reply.send(CoachConversationResponseSchema.parse({ conversation }));
  });

  app.delete('/coach/conversation', { preHandler: app.authenticate }, async (request, reply) => {
    await clearConversation(app.prisma, request.user.sub);
    reply.status(204).send();
  });

  app.post('/coach/messages', { preHandler: app.authenticate }, async (request, reply) => {
    const body = SendCoachMessageRequestSchema.parse(request.body);
    const result = await sendCoachMessage(
      { prisma: app.prisma, aiProvider: app.aiProvider },
      request.user.sub,
      body.message,
    );
    reply.send(SendCoachMessageResponseSchema.parse(result));
  });
}
