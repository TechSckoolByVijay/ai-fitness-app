import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateFavoriteFoodRequest, LogFavoriteFoodRequest } from '@fitness-app/shared';
import { createFavoriteFood, deleteFavoriteFood, listFavoriteFoods, logFavoriteFood } from '../api/favorites.api';
import { queryKeys } from '../api/queryKeys';
import { useAuthStore } from '../state/authStore';

export function useFavorites() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: listFavoriteFoods,
    enabled: status === 'authenticated',
  });
}

export function useCreateFavoriteFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFavoriteFoodRequest) => createFavoriteFood(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.favorites }),
  });
}

export function useDeleteFavoriteFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFavoriteFood(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.favorites }),
  });
}

export function useLogFavoriteFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: LogFavoriteFoodRequest }) => logFavoriteFood(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardToday });
      queryClient.invalidateQueries({ queryKey: ['food', 'entries'] });
    },
  });
}
