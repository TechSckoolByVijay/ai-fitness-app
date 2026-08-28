import {
  CoachConversationResponseSchema,
  CoachMessageReactionRequestSchema,
  SendCoachMessageRequestSchema,
  SendCoachMessageResponseSchema,
} from '@fitness-app/shared';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { consumeAiQuota } from '../ai-quota/ai-quota.service';
import { clearConversation, getCurrentConversation, sendCoachMessage, setMessageReaction } from './coach-chat.service';

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
    await consumeAiQuota(app.prisma, request.user.sub, 'coach', app.env.AI_DAILY_COACH_LIMIT);
    const result = await sendCoachMessage(
      { prisma: app.prisma, aiProvider: app.aiProvider },
      request.user.sub,
      body.message,
      body.localHour,
    );
    reply.send(SendCoachMessageResponseSchema.parse(result));
  });

  app.post('/coach/messages/:messageId/reaction', { preHandler: app.authenticate }, async (request, reply) => {
    const { messageId } = z.object({ messageId: z.string().uuid() }).parse(request.params);
    const body = CoachMessageReactionRequestSchema.parse(request.body);
    await setMessageReaction(app.prisma, request.user.sub, messageId, body.reaction);
    reply.status(204).send();
  });
}
