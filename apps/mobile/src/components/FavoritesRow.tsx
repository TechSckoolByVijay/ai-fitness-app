import { sumNutrition, type FavoriteFoodDto } from '@fitness-app/shared';
import { Pressable, ScrollView, View } from 'react-native';
import { useDeleteFavoriteFood, useLogFavoriteFood } from '../hooks/useFavorites';
import { Text } from './ui/Text';

interface FavoritesRowProps {
  favorites: FavoriteFoodDto[];
}

export function FavoritesRow({ favorites }: FavoritesRowProps) {
  const logFavorite = useLogFavoriteFood();
  const deleteFavorite = useDeleteFavoriteFood();

  if (favorites.length === 0) return null;

  return (
    <View>
      <Text variant="subtitle" className="mb-2">
        Favorites
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {favorites.map((favorite) => {
          const totals = sumNutrition(favorite.items.map((i) => i.nutrition));
          return (
            <Pressable
              key={favorite.id}
              accessibilityRole="button"
              accessibilityLabel={`Log ${favorite.name}`}
              onPress={() => logFavorite.mutate({ id: favorite.id })}
              disabled={logFavorite.isPending}
              className="w-40 gap-1 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-muted-dark"
            >
              <View className="flex-row items-start justify-between gap-1">
                <Text variant="body" className="flex-1 font-medium capitalize" numberOfLines={2}>
                  {favorite.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${favorite.name} from favorites`}
                  onPress={() => deleteFavorite.mutate(favorite.id)}
                  hitSlop={8}
                >
                  <Text variant="caption" className="text-red-500">
                    ×
                  </Text>
                </Pressable>
              </View>
              <Text variant="caption" className="capitalize">
                {favorite.mealType} · {Math.round(totals.calories)} kcal
              </Text>
              <Text variant="caption" className="text-primary-600 dark:text-primary-400">
                Tap to log
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
