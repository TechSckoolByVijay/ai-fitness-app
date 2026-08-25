import type { Prisma, PrismaClient } from '@prisma/client';
import type { AiMessageDto, CoachConversationDto, SendCoachMessageResponse } from '@fitness-app/shared';
import type { AIProvider, CoachChatMessage } from '../../providers/ai/ai-provider.interface';
import { buildCoachContext } from './coach-context.service';

const MAX_HISTORY_MESSAGES = 20;

function toMessageDto(message: { id: string; role: string; content: string; createdAt: Date }): AiMessageDto {
  return {
    id: message.id,
    role: message.role as 'user' | 'assistant',
    content: message.content,
    createdAt: message.createdAt.toISOString(),
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

  return { id: conversation.id, messages: conversation.messages.map(toMessageDto) };
}

export async function sendCoachMessage(
  deps: { prisma: PrismaClient; aiProvider: AIProvider },
  userId: string,
  message: string,
): Promise<SendCoachMessageResponse> {
  const { prisma, aiProvider } = deps;

  const [context, existingConversation] = await Promise.all([
    buildCoachContext(prisma, userId),
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
