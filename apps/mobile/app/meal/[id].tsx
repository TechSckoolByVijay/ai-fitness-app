import { sumNutrition, type FoodItemInput } from '@fitness-app/shared';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { CalorieSlider } from '../../src/components/ui/CalorieSlider';
import { Card } from '../../src/components/ui/Card';
import { Text } from '../../src/components/ui/Text';
import { TextField } from '../../src/components/ui/TextField';
import { useCalorieSliderBounds } from '../../src/hooks/useCalorieSliderBounds';
import { useCreateFavoriteFood } from '../../src/hooks/useFavorites';
import { useCreateFoodEntry, useDeleteFoodEntry, useFoodEntries, useUpdateFoodEntry } from '../../src/hooks/useFoodEntries';
import { useRequireAuth } from '../../src/hooks/useRequireAuth';
import { formatTime } from '../../src/utils/date';
import { goBackOrHome } from '../../src/utils/navigation';
import { scaleNutritionToCalories } from '../../src/utils/nutritionOverride';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function confirmAsync(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function MealDetailScreen() {
  const isAuthenticated = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useFoodEntries();
  const entry = useMemo(() => data?.entries.find((e) => e.id === id), [data, id]);
  const updateEntry = useUpdateFoodEntry();
  const deleteEntry = useDeleteFoodEntry();
  const createEntry = useCreateFoodEntry();
  const createFavorite = useCreateFavoriteFood();

  const [items, setItems] = useState<FoodItemInput[] | null>(null);
  const [favoriteNameDraft, setFavoriteNameDraft] = useState<string | null>(null);
  const editableItems = items ?? entry?.items ?? [];
  const isEditing = items !== null;
  const getBounds = useCalorieSliderBounds(id ?? 'meal');

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#12c06e" />
      </View>
    );
  }

  if (!entry) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-surface-dark">
        <Text variant="body">Meal not found.</Text>
      </View>
    );
  }

  const adjustQuantity = (index: number, delta: number) => {
    const base = items ?? entry.items;
    const next = [...base];
    const item = next[index];
    const step = item.unit === 'g' || item.unit === 'ml' ? delta * 10 : delta;
    const minQty = item.unit === 'g' || item.unit === 'ml' ? 10 : 1;
    const newQuantity = Math.max(minQty, item.quantity + step);
    const scale = newQuantity / item.quantity;

    next[index] = {
      ...item,
      quantity: newQuantity,
      nutrition: {
        ...item.nutrition,
        calories: round1(item.nutrition.calories * scale),
        proteinG: round1(item.nutrition.proteinG * scale),
        carbsG: round1(item.nutrition.carbsG * scale),
        fatG: round1(item.nutrition.fatG * scale),
        fiberG: round1((item.nutrition.fiberG ?? 0) * scale),
      },
    };
    setItems(next);
  };

  const adjustCalories = (index: number, calories: number) => {
    const base = items ?? entry.items;
    const next = [...base];
    next[index] = { ...next[index], nutrition: scaleNutritionToCalories(next[index].nutrition, calories) };
    setItems(next);
  };

  const saveEdit = async () => {
    if (!items) return;
    await updateEntry.mutateAsync({ id: entry.id, input: { items } });
    setItems(null);
  };

  const handleDelete = async () => {
    const confirmed = await confirmAsync('Delete meal?', 'This can\'t be undone.');
    if (!confirmed) return;
    await deleteEntry.mutateAsync(entry.id);
    goBackOrHome();
  };

  const handleDuplicate = async () => {
    await createEntry.mutateAsync({
      mealType: entry.mealType,
      loggedAt: new Date().toISOString(),
      sourceText: entry.sourceText ?? undefined,
      items: entry.items,
    });
    goBackOrHome();
  };

  const startSaveFavorite = () => {
    setFavoriteNameDraft(entry.items.map((i) => i.name).join(', ').slice(0, 80));
  };

  const confirmSaveFavorite = async () => {
    if (!favoriteNameDraft?.trim()) return;
    await createFavorite.mutateAsync({
      name: favoriteNameDraft.trim(),
      mealType: entry.mealType,
      items: entry.items,
    });
    setFavoriteNameDraft(null);
  };

  const totals = sumNutrition(editableItems.map((i) => i.nutrition));

  return (
    <ScrollView className="flex-1 bg-surface-light dark:bg-surface-dark" contentContainerClassName="gap-4 p-5">
      <Text variant="title" className="capitalize">
        {entry.mealType}
      </Text>
      <Text variant="caption">{formatTime(new Date(entry.loggedAt))}</Text>
      {entry.sourceText === '[Photo]' ? (
        <Text variant="caption" className="italic">
          📷 Logged from a photo
        </Text>
      ) : entry.sourceText ? (
        <Text variant="caption" className="italic">
          &quot;{entry.sourceText}&quot;
        </Text>
      ) : null}

      <Card className="gap-3">
        {editableItems.map((item, index) => {
          const bounds = getBounds(index, item.quantity, item.nutrition.calories);
          return (
            <View key={index} className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text variant="body" className="flex-1 capitalize">
                  {item.quantity} {item.unit} {item.name}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text variant="caption">{Math.round(item.nutrition.calories)} kcal</Text>
                  {isEditing ? (
                    <View className="flex-row gap-1">
                      <Pressable
                        onPress={() => adjustQuantity(index, -1)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-muted-light dark:bg-muted-dark"
                      >
                        <Text variant="body">−</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => adjustQuantity(index, 1)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-muted-light dark:bg-muted-dark"
                      >
                        <Text variant="body">+</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
              {isEditing ? (
                <CalorieSlider
                  calories={item.nutrition.calories}
                  minCalories={bounds.min}
                  maxCalories={bounds.max}
                  onChange={(calories) => adjustCalories(index, calories)}
                />
              ) : null}
            </View>
          );
        })}
        <View className="border-t border-gray-100 pt-2 dark:border-gray-800">
          <Text variant="subtitle">{Math.round(totals.calories)} kcal total</Text>
          <Text variant="caption">
            {Math.round(totals.proteinG)}g protein · {Math.round(totals.carbsG)}g carbs · {Math.round(totals.fatG)}g fat
          </Text>
        </View>
      </Card>

      {isEditing ? (
        <View className="flex-row gap-3">
          <Button label="Save changes" onPress={saveEdit} loading={updateEntry.isPending} className="flex-1" />
          <Button label="Cancel" variant="secondary" onPress={() => setItems(null)} />
        </View>
      ) : (
        <View className="gap-3">
          <Button label="Edit" onPress={() => setItems(entry.items)} />
          <Button label="Duplicate to now" variant="secondary" onPress={handleDuplicate} loading={createEntry.isPending} />

          {favoriteNameDraft !== null ? (
            <View className="gap-2">
              <TextField label="Favorite name" value={favoriteNameDraft} onChangeText={setFavoriteNameDraft} />
              <View className="flex-row gap-3">
                <Button
                  label="Save favorite"
                  onPress={confirmSaveFavorite}
                  loading={createFavorite.isPending}
                  disabled={!favoriteNameDraft.trim()}
                  className="flex-1"
                />
                <Button label="Cancel" variant="secondary" onPress={() => setFavoriteNameDraft(null)} />
              </View>
            </View>
          ) : (
            <Button label="Save as favorite" variant="secondary" onPress={startSaveFavorite} />
          )}

          <Button label="Delete" variant="ghost" onPress={handleDelete} loading={deleteEntry.isPending} />
        </View>
      )}
    </ScrollView>
  );
}
