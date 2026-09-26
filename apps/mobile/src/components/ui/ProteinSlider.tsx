import Slider from '@react-native-community/slider';
import { View } from 'react-native';
import { PROTEIN_STEP_G } from '../../utils/nutritionOverride';
import { Text } from './Text';

interface ProteinSliderProps {
  proteinG: number;
  minProteinG: number;
  maxProteinG: number;
  onChange: (proteinG: number) => void;
}

// Sits under the calorie slider in the same panel style, in the protein
// colour used by the Progress chart so the two numbers read as a pair.
export function ProteinSlider({ proteinG, minProteinG, maxProteinG, onChange }: ProteinSliderProps) {
  return (
    <View className="gap-0.5 rounded-2xl bg-sky-50 px-3 py-2.5 dark:bg-sky-900/30">
      <View className="flex-row items-center justify-between">
        <Text variant="caption" className="font-bold text-sky-700 dark:text-sky-300">
          💪 Slide to fix protein
        </Text>
        <Text variant="body" className="font-extrabold text-sky-700 dark:text-sky-300">
          {Math.round(proteinG)} g
        </Text>
      </View>
      <Slider
        minimumValue={minProteinG}
        maximumValue={maxProteinG}
        step={PROTEIN_STEP_G}
        value={proteinG}
        onValueChange={onChange}
        minimumTrackTintColor="#0ea5e9"
        maximumTrackTintColor="#d1d5db"
        thumbTintColor="#0284c7"
      />
      <View className="flex-row justify-between">
        <Text variant="caption" className="text-[12px]">
          {minProteinG} g
        </Text>
        <Text variant="caption" className="text-[12px]">
          {maxProteinG} g
        </Text>
      </View>
    </View>
  );
}
