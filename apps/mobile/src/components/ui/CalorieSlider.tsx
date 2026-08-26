import Slider from '@react-native-community/slider';
import { View } from 'react-native';
import { Text } from './Text';

interface CalorieSliderProps {
  calories: number;
  minCalories: number;
  maxCalories: number;
  onChange: (calories: number) => void;
}

export function CalorieSlider({ calories, minCalories, maxCalories, onChange }: CalorieSliderProps) {
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <Text variant="caption">Not quite right? Drag to correct</Text>
        <Text variant="body" className="font-semibold">
          {Math.round(calories)} kcal
        </Text>
      </View>
      <Slider
        minimumValue={minCalories}
        maximumValue={maxCalories}
        step={5}
        value={calories}
        onValueChange={onChange}
        minimumTrackTintColor="#22b56d"
        maximumTrackTintColor="#e5e7eb"
        thumbTintColor="#159157"
      />
      <View className="flex-row justify-between">
        <Text variant="caption">{minCalories} kcal</Text>
        <Text variant="caption">{maxCalories} kcal</Text>
      </View>
    </View>
  );
}
