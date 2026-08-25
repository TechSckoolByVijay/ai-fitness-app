import type { EventInterpretRequest, EventInterpretResponse } from '@fitness-app/shared';
import { apiRequest } from './client';

export function interpretEvent(input: EventInterpretRequest) {
  return apiRequest<EventInterpretResponse>('/events/interpret', { method: 'POST', body: input });
}
