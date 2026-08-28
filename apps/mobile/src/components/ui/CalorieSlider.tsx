import Slider from '@react-native-community/slider';
import { View } from 'react-native';
import { Text } from './Text';

interface CalorieSliderProps {
  calories: number;
  minCalories: number;
  maxCalories: number;
  onChange: (calories: number) => void;
}

// Lives inside its own tinted panel so it reads as a feature, not a
// footnote — users were not discovering the thin bare slider at all.
export function CalorieSlider({ calories, minCalories, maxCalories, onChange }: CalorieSliderProps) {
  return (
    <View className="gap-0.5 rounded-2xl bg-primary-50 px-3 py-2.5 dark:bg-primary-900/30">
      <View className="flex-row items-center justify-between">
        <Text variant="caption" className="font-bold text-primary-700 dark:text-primary-300">
          🎚️ Slide to fix calories
        </Text>
        <Text variant="body" className="font-extrabold text-primary-700 dark:text-primary-300">
          {Math.round(calories)} kcal
        </Text>
      </View>
      <Slider
        minimumValue={minCalories}
        maximumValue={maxCalories}
        step={5}
        value={calories}
        onValueChange={onChange}
        minimumTrackTintColor="#12c06e"
        maximumTrackTintColor="#d1d5db"
        thumbTintColor="#0aa25c"
      />
      <View className="flex-row justify-between">
        <Text variant="caption" className="text-[12px]">
          {minCalories}
        </Text>
        <Text variant="caption" className="text-[12px]">
          {maxCalories}
        </Text>
      </View>
    </View>
  );
}
