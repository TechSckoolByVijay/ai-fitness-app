import { sumNutrition, type FrequentMealDto } from '@fitness-app/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useCreateFavoriteFood } from '../hooks/useFavorites';
import { Button } from './ui/Button';
import { Text } from './ui/Text';
import { TextField } from './ui/TextField';

interface SuggestedMealsRowProps {
  frequentMeals: FrequentMealDto[];
}

export function SuggestedMealsRow({ frequentMeals }: SuggestedMealsRowProps) {
  const createFavorite = useCreateFavoriteFood();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  if (frequentMeals.length === 0) return null;

  const startSaving = (meal: FrequentMealDto) => {
    setSavingId(meal.id);
    setNameDraft(meal.name);
  };

  const confirmSave = async (meal: FrequentMealDto) => {
    if (!nameDraft.trim()) return;
    await createFavorite.mutateAsync({ name: nameDraft.trim(), mealType: meal.mealType, items: meal.items });
    setSavingId(null);
  };

  return (
    <View>
      <Text variant="subtitle" className="mb-2">
        You often eat this
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {frequentMeals.map((meal) => {
          const totals = sumNutrition(meal.items.map((item) => item.nutrition));
          const isSaving = savingId === meal.id;
          return (
            <View
              key={meal.id}
              className="w-44 gap-1.5 rounded-xl border border-dashed border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-muted-dark"
            >
              <Text variant="body" className="font-medium capitalize" numberOfLines={2}>
                {meal.name}
              </Text>
              <Text variant="caption" className="capitalize">
                {meal.mealType} · {Math.round(totals.calories)} kcal · logged {meal.useCount}×
              </Text>
              {isSaving ? (
                <View className="gap-1.5">
                  <TextField label="" value={nameDraft} onChangeText={setNameDraft} placeholder="Favorite name" />
                  <View className="flex-row gap-1.5">
                    <Button
                      label="Save"
                      onPress={() => confirmSave(meal)}
                      loading={createFavorite.isPending}
                      disabled={!nameDraft.trim()}
                      className="flex-1"
                    />
                    <Button label="✕" variant="secondary" onPress={() => setSavingId(null)} />
                  </View>
                </View>
              ) : (
                <Button label="Save as favorite" variant="secondary" onPress={() => startSaving(meal)} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
