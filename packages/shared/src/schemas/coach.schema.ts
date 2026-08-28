import { z } from 'zod';

export const AiMessageRoleSchema = z.enum(['user', 'assistant']);
export type AiMessageRole = z.infer<typeof AiMessageRoleSchema>;

export const CoachReactionSchema = z.enum(['liked', 'disliked']);
export type CoachReaction = z.infer<typeof CoachReactionSchema>;

export const AiMessageDtoSchema = z.object({
  id: z.string().uuid(),
  role: AiMessageRoleSchema,
  content: z.string(),
  createdAt: z.string(),
  /** The user's thumbs up/down on an assistant suggestion — feeds future personalization. */
  reaction: CoachReactionSchema.nullable().optional(),
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
  /** The user's local hour (0-23) — the server runs in UTC and would otherwise suggest dinner at breakfast time. */
  localHour: z.number().int().min(0).max(23).optional(),
});
export type SendCoachMessageRequest = z.infer<typeof SendCoachMessageRequestSchema>;

export const SendCoachMessageResponseSchema = z.object({
  conversationId: z.string().uuid(),
  userMessage: AiMessageDtoSchema,
  assistantMessage: AiMessageDtoSchema,
});
export type SendCoachMessageResponse = z.infer<typeof SendCoachMessageResponseSchema>;

export const CoachMessageReactionRequestSchema = z.object({
  /** null clears a previously set reaction. */
  reaction: CoachReactionSchema.nullable(),
});
export type CoachMessageReactionRequest = z.infer<typeof CoachMessageReactionRequestSchema>;
