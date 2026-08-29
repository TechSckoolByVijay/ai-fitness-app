import type { ActivityLevel, Sex } from '@fitness-app/shared';
import { kgToDisplayWeight, UNIT_LABELS, weightInputToKg } from '@fitness-app/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { Chip } from '../src/components/ui/Chip';
import { Text } from '../src/components/ui/Text';
import { HeightField } from '../src/components/ui/HeightField';
import { TextField } from '../src/components/ui/TextField';
import { useMe } from '../src/hooks/useMe';
import { useUpdateProfile } from '../src/hooks/useOnboardingMutations';
import { useUnitSystem } from '../src/hooks/useUnitSystem';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { goBackOrHome } from '../src/utils/navigation';

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

export default function EditBodyInfoScreen() {
  const isAuthenticated = useRequireAuth();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const unitSystem = useUnitSystem();

  const [dateOfBirth, setDateOfBirth] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [currentWeightKg, setCurrentWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!me.data || hydrated) return;
    const profile = me.data.profile;
    setDateOfBirth(profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '');
    setHeightCm(profile.heightCm !== null ? String(profile.heightCm) : '');
    // Stored kilograms are shown in whatever unit the user has chosen.
    setCurrentWeightKg(
      profile.currentWeightKg !== null ? String(kgToDisplayWeight(profile.currentWeightKg, unitSystem)) : '',
    );
    setTargetWeightKg(
      profile.targetWeightKg !== null ? String(kgToDisplayWeight(profile.targetWeightKg, unitSystem)) : '',
    );
    setSex(profile.sex);
    setActivityLevel(profile.activityLevel);
    setHydrated(true);
  }, [me.data, hydrated, unitSystem]);

  const isValid =
    DATE_PATTERN.test(dateOfBirth) &&
    Number(heightCm) > 0 &&
    Number(currentWeightKg) > 0 &&
    sex !== null &&
    activityLevel !== null;

  const submit = async () => {
    if (!isValid || !sex || !activityLevel) return;
    setError(null);
    try {
      await updateProfile.mutateAsync({
        dateOfBirth,
        heightCm: Number(heightCm),
        // The inputs hold the user's chosen unit; the API is always kilograms.
        currentWeightKg: weightInputToKg(Number(currentWeightKg), unitSystem),
        targetWeightKg: targetWeightKg ? weightInputToKg(Number(targetWeightKg), unitSystem) : undefined,
        sex,
        activityLevel,
      });
      goBackOrHome();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (!isAuthenticated || me.isLoading || !hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#12c06e" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-surface-light dark:bg-surface-dark"
    >
      <ScrollView contentContainerClassName="gap-4 p-5">
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

        {error ? (
          <Text variant="caption" className="text-red-500">
            {error}
          </Text>
        ) : null}

        <Button label="Save" onPress={submit} disabled={!isValid} loading={updateProfile.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
