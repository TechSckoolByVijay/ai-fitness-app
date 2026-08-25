import { z } from 'zod';

export const AiMessageRoleSchema = z.enum(['user', 'assistant']);
export type AiMessageRole = z.infer<typeof AiMessageRoleSchema>;

export const AiMessageDtoSchema = z.object({
  id: z.string().uuid(),
  role: AiMessageRoleSchema,
  content: z.string(),
  createdAt: z.string(),
});
export type AiMessageDto = z.infer<typeof AiMessageDtoSchema>;

export const CoachConversationDtoSchema = z.object({
  id: z.string().uuid(),
  messages: z.array(AiMessageDtoSchema),
});
export type CoachConversationDto = z.infer<typeof CoachConversationDtoSchema>;

/** The user's single ongoing coach conversation — null until they've sent a first message. */
export const CoachConversationResponseSchema = z.object({
  conversation: CoachConversationDtoSchema.nullable(),
});
export type CoachConversationResponse = z.infer<typeof CoachConversationResponseSchema>;

export const SendCoachMessageRequestSchema = z.object({
  message: z.string().min(1).max(2000),
});
export type SendCoachMessageRequest = z.infer<typeof SendCoachMessageRequestSchema>;

export const SendCoachMessageResponseSchema = z.object({
  conversationId: z.string().uuid(),
  userMessage: AiMessageDtoSchema,
  assistantMessage: AiMessageDtoSchema,
});
export type SendCoachMessageResponse = z.infer<typeof SendCoachMessageResponseSchema>;
