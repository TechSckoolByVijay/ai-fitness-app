import { kgToDisplayWeight, UNIT_LABELS, weightInputToKg } from '@fitness-app/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { nextStepRoute, stepNumber } from '../../src/components/onboarding/steps';
import { Button } from '../../src/components/ui/Button';
import { RulerPicker } from '../../src/components/ui/RulerPicker';
import { Text } from '../../src/components/ui/Text';
import { TextField } from '../../src/components/ui/TextField';
import { useUpdateProfile } from '../../src/hooks/useOnboardingMutations';
import { useUnitSystem } from '../../src/hooks/useUnitSystem';
import type { RulerConfig } from '../../src/utils/ruler';

const RULER: Record<'metric' | 'imperial', RulerConfig> = {
  metric: { min: 30, max: 250, step: 0.1 },
  imperial: { min: 66, max: 550, step: 1 },
};

const DEFAULT_KG = 70;

export default function WeightStep() {
  const updateProfile = useUpdateProfile();
  const unitSystem = useUnitSystem();

  const [current, setCurrent] = useState(kgToDisplayWeight(DEFAULT_KG, unitSystem));
  const [target, setTarget] = useState('');

  const handleNext = async () => {
    await updateProfile.mutateAsync({
      currentWeightKg: weightInputToKg(current, unitSystem),
      targetWeightKg: target ? weightInputToKg(Number(target), unitSystem) : undefined,
    });
    router.push(nextStepRoute('weight'));
  };

  return (
    <OnboardingScaffold
      step={stepNumber('weight')}
      title="What do you weigh?"
      subtitle="Drag the scale — you can change this any time."
      footer={<Button label="Continue" onPress={handleNext} loading={updateProfile.isPending} />}
    >
      <RulerPicker
        value={current}
        onChange={setCurrent}
        config={RULER[unitSystem]}
        unitLabel={UNIT_LABELS[unitSystem].weight}
      />
      <View className="mt-4">
        <TextField
          label={`Goal weight (${UNIT_LABELS[unitSystem].weight}) — optional`}
          value={target}
          onChangeText={setTarget}
          keyboardType="numeric"
          placeholder={unitSystem === 'imperial' ? '145' : '65'}
        />
        <Text variant="caption" className="mt-1 text-gray-500 dark:text-gray-400">
          Leave this blank if you'd rather not set one.
        </Text>
      </View>
    </OnboardingScaffold>
  );
}
