import type {
  CoachConversationResponse,
  CoachReaction,
  SendCoachMessageRequest,
  SendCoachMessageResponse,
} from '@fitness-app/shared';
import { apiRequest } from './client';

export function getCoachConversation() {
  return apiRequest<CoachConversationResponse>('/coach/conversation');
}

export function sendCoachMessage(input: SendCoachMessageRequest) {
  return apiRequest<SendCoachMessageResponse>('/coach/messages', { method: 'POST', body: input });
}

export function clearCoachConversation() {
  return apiRequest<void>('/coach/conversation', { method: 'DELETE' });
}

export function reactToCoachMessage(messageId: string, reaction: CoachReaction | null) {
  return apiRequest<void>(`/coach/messages/${messageId}/reaction`, { method: 'POST', body: { reaction } });
}
