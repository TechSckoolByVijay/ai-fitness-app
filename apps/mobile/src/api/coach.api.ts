import type {
  CoachConversationResponse,
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
