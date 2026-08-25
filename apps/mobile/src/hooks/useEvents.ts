import { useMutation } from '@tanstack/react-query';
import type { EventInterpretRequest } from '@fitness-app/shared';
import { interpretEvent } from '../api/events.api';

export function useInterpretEvent() {
  return useMutation({
    mutationFn: (input: EventInterpretRequest) => interpretEvent(input),
  });
}
