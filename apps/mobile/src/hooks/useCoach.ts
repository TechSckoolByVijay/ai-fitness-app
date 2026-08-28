import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CoachConversationResponse, CoachReaction } from '@fitness-app/shared';
import { clearCoachConversation, getCoachConversation, reactToCoachMessage, sendCoachMessage } from '../api/coach.api';
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

export function useClearCoachConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearCoachConversation,
    onSuccess: () => {
      queryClient.setQueryData<CoachConversationResponse>(queryKeys.coachConversation, { conversation: null });
    },
  });
}

export function useReactToCoachMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, reaction }: { messageId: string; reaction: CoachReaction | null }) =>
      reactToCoachMessage(messageId, reaction),
    // Optimistic — a thumbs tap should feel instant, and a failed call just
    // means the reaction quietly reverts on the next refetch.
    onMutate: ({ messageId, reaction }) => {
      queryClient.setQueryData<CoachConversationResponse>(queryKeys.coachConversation, (prev) => {
        if (!prev?.conversation) return prev;
        return {
          conversation: {
            ...prev.conversation,
            messages: prev.conversation.messages.map((m) => (m.id === messageId ? { ...m, reaction } : m)),
          },
        };
      });
    },
  });
}

export function useSendCoachMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    // localHour lets the server know what mealtime it is where the user
    // actually is (the API itself runs in UTC).
    mutationFn: (message: string) => sendCoachMessage({ message, localHour: new Date().getHours() }),
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
