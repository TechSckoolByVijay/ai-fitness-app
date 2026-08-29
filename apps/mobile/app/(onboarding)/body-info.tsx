import type { ActivityLevel, Sex } from '@fitness-app/shared';
import { kgToDisplayWeight, UNIT_LABELS, weightInputToKg } from '@fitness-app/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { Text } from '../../src/components/ui/Text';
import { HeightField } from '../../src/components/ui/HeightField';
import { TextField } from '../../src/components/ui/TextField';
import { useUpdateProfile } from '../../src/hooks/useOnboardingMutations';
import { useUnitSystem } from '../../src/hooks/useUnitSystem';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary — little to no exercise' },
  { value: 'light', label: 'Light — exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderate — exercise 3-5 days/week' },
  { value: 'active', label: 'Active — exercise 6-7 days/week' },
  { value: 'very_active', label: 'Very active — physical job or 2x/day training' },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function BodyInfoStep() {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [currentWeightKg, setCurrentWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const updateProfile = useUpdateProfile();
  const unitSystem = useUnitSystem();

  const isValid =
    DATE_PATTERN.test(dateOfBirth) &&
    Number(heightCm) > 0 &&
    Number(currentWeightKg) > 0 &&
    sex !== null &&
    activityLevel !== null;

  const handleNext = async () => {
    if (!isValid || !sex || !activityLevel) return;
    await updateProfile.mutateAsync({
      dateOfBirth,
      heightCm: Number(heightCm),
      // The inputs hold the user's chosen unit; the API is always kilograms.
      currentWeightKg: weightInputToKg(Number(currentWeightKg), unitSystem),
      targetWeightKg: targetWeightKg ? weightInputToKg(Number(targetWeightKg), unitSystem) : undefined,
      sex,
      activityLevel,
    });
    router.push('/goal');
  };

  return (
    <OnboardingScaffold
      step={2}
      title="Tell us about you"
      subtitle="This helps us calculate your personalized calorie and nutrition targets."
      footer={
        <Button label="Continue" onPress={handleNext} disabled={!isValid} loading={updateProfile.isPending} />
      }
    >
      <TextField
        label="Date of birth (YYYY-MM-DD)"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="1995-06-15"
        keyboardType="numbers-and-punctuation"
      />
      <HeightField valueCm={heightCm} onChangeCm={setHeightCm} unitSystem={unitSystem} />
      <TextField
        label={`Current weight (${UNIT_LABELS[unitSystem].weight})`}
        value={currentWeightKg}
        onChangeText={setCurrentWeightKg}
        keyboardType="numeric"
        placeholder={unitSystem === 'imperial' ? '155' : '70'}
      />
      <TextField
        label={`Target weight (${UNIT_LABELS[unitSystem].weight}) — optional`}
        value={targetWeightKg}
        onChangeText={setTargetWeightKg}
        keyboardType="numeric"
        placeholder={unitSystem === 'imperial' ? '145' : '65'}
      />

      <View className="gap-2">
        <Text variant="caption">Sex</Text>
        <View className="flex-row flex-wrap gap-2">
          {SEX_OPTIONS.map((opt) => (
            <Chip key={opt.value} label={opt.label} selected={sex === opt.value} onPress={() => setSex(opt.value)} />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text variant="caption">Activity level</Text>
        <View className="gap-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={activityLevel === opt.value}
              onPress={() => setActivityLevel(opt.value)}
            />
          ))}
        </View>
      </View>
    </OnboardingScaffold>
  );
}
