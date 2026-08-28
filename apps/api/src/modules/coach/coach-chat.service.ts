import type { Prisma, PrismaClient } from '@prisma/client';
import type { AiMessageDto, CoachConversationDto, CoachReaction, SendCoachMessageResponse } from '@fitness-app/shared';
import type { AIProvider, CoachChatMessage } from '../../providers/ai/ai-provider.interface';
import { NotFoundError } from '../../lib/errors';
import { buildCoachContext } from './coach-context.service';

const MAX_HISTORY_MESSAGES = 20;
const REACTION_SUBJECT_TYPE = 'coach_message';
/** How much of the reacted-to suggestion is stored in feedback.notes — enough to identify the dish when recalled into future prompts. */
const REACTION_NOTES_LENGTH = 200;

function toMessageDto(
  message: { id: string; role: string; content: string; createdAt: Date },
  reaction: CoachReaction | null = null,
): AiMessageDto {
  return {
    id: message.id,
    role: message.role as 'user' | 'assistant',
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    reaction,
  };
}

/** Phase 1 keeps a single ongoing conversation per user rather than modeling multiple named threads — matches the "one Coach to talk to" UX. */
export async function getCurrentConversation(
  prisma: PrismaClient,
  userId: string,
): Promise<CoachConversationDto | null> {
  const conversation = await prisma.aiConversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conversation) return null;

  const feedback = await prisma.userFeedback.findMany({
    where: { userId, subjectType: REACTION_SUBJECT_TYPE, subjectId: { in: conversation.messages.map((m) => m.id) } },
  });
  const reactionByMessageId = new Map(feedback.map((f) => [f.subjectId, f.feedbackType as CoachReaction]));

  return {
    id: conversation.id,
    messages: conversation.messages.map((m) => toMessageDto(m, reactionByMessageId.get(m.id) ?? null)),
  };
}

/**
 * Records a thumbs up/down on one of the Coach's suggestions (null clears
 * it). The suggestion text is snapshotted into feedback.notes so future
 * prompt-building can recall taste history without joining back to messages.
 */
export async function setMessageReaction(
  prisma: PrismaClient,
  userId: string,
  messageId: string,
  reaction: CoachReaction | null,
): Promise<void> {
  const message = await prisma.aiMessage.findFirst({
    where: { id: messageId, role: 'assistant', conversation: { userId } },
  });
  if (!message) throw new NotFoundError('Message not found');

  await prisma.userFeedback.deleteMany({
    where: { userId, subjectType: REACTION_SUBJECT_TYPE, subjectId: messageId },
  });
  if (reaction) {
    await prisma.userFeedback.create({
      data: {
        userId,
        subjectType: REACTION_SUBJECT_TYPE,
        subjectId: messageId,
        feedbackType: reaction,
        notes: message.content.slice(0, REACTION_NOTES_LENGTH),
      },
    });
  }
}

/** Clears the user's coach chat history. Messages cascade-delete with the conversation; the next message simply starts a fresh one. */
export async function clearConversation(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.aiConversation.deleteMany({ where: { userId } });
}

export async function sendCoachMessage(
  deps: { prisma: PrismaClient; aiProvider: AIProvider },
  userId: string,
  message: string,
  localHour?: number,
): Promise<SendCoachMessageResponse> {
  const { prisma, aiProvider } = deps;

  const [context, existingConversation] = await Promise.all([
    buildCoachContext(prisma, userId, { localHour }),
    prisma.aiConversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: MAX_HISTORY_MESSAGES } },
    }),
  ]);

  const conversation =
    existingConversation ?? (await prisma.aiConversation.create({ data: { userId }, include: { messages: true } }));

  const userMessage = await prisma.aiMessage.create({
    data: { conversationId: conversation.id, role: 'user', content: message },
  });

  const history: CoachChatMessage[] = [
    ...conversation.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ];

  const replyText = await aiProvider.coachChat({ messages: history, context });

  const assistantMessage = await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'assistant',
      content: replyText,
      contextJson: context as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.aiConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

  return {
    conversationId: conversation.id,
    userMessage: toMessageDto(userMessage),
    assistantMessage: toMessageDto(assistantMessage),
  };
}
