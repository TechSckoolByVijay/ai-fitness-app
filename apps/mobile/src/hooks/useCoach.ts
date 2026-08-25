import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CoachConversationResponse } from '@fitness-app/shared';
import { getCoachConversation, sendCoachMessage } from '../api/coach.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useCoachConversation() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.coachConversation,
    queryFn: getCoachConversation,
    enabled: status === 'authenticated',
  });
}

export function useSendCoachMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => sendCoachMessage({ message }),
    onSuccess: (result) => {
      queryClient.setQueryData<CoachConversationResponse>(queryKeys.coachConversation, (prev) => {
        const existingMessages = prev?.conversation?.messages ?? [];
        return {
          conversation: {
            id: result.conversationId,
            messages: [...existingMessages, result.userMessage, result.assistantMessage],
          },
        };
      });
    },
  });
}
