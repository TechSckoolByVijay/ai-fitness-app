import { cmToFeetInches, feetInchesToCm, type UnitSystem } from '@fitness-app/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { TextField } from './TextField';

interface HeightFieldProps {
  /** Always centimetres — the stored unit — regardless of what is displayed. */
  valueCm: string;
  onChangeCm: (cm: string) => void;
  unitSystem: UnitSystem;
}

/**
 * Height input that speaks the user's system but always reports centimetres.
 *
 * Imperial needs two boxes rather than one decimal, because nobody thinks of
 * their height as 5.58 feet. The feet/inches pair is local state so that
 * clearing one box mid-edit doesn't momentarily rewrite the other through a
 * round-trip conversion.
 */
export function HeightField({ valueCm, onChangeCm, unitSystem }: HeightFieldProps) {
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');

  // Seed the imperial boxes from cm whenever the stored value changes from
  // outside (initial hydration, or the user switching systems).
  useEffect(() => {
    if (unitSystem !== 'imperial') return;
    const cm = Number(valueCm);
    if (!Number.isFinite(cm) || cm <= 0) return;
    const split = cmToFeetInches(cm);
    const nextFeet = String(split.feet);
    const nextInches = String(split.inches);
    // Only overwrite when the boxes describe a different height, so typing
    // is never interrupted by a re-render.
    if (feetInchesToCm(Number(feet) || 0, Number(inches) || 0).toFixed(1) !== cm.toFixed(1)) {
      setFeet(nextFeet);
      setInches(nextInches);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueCm, unitSystem]);

  if (unitSystem !== 'imperial') {
    return (
      <TextField
        label="Height (cm)"
        value={valueCm}
        onChangeText={onChangeCm}
        keyboardType="numeric"
        placeholder="170"
      />
    );
  }

  const commit = (nextFeet: string, nextInches: string) => {
    const f = Number(nextFeet);
    const i = Number(nextInches);
    if (!Number.isFinite(f) || !Number.isFinite(i) || (nextFeet === '' && nextInches === '')) {
      onChangeCm('');
      return;
    }
    onChangeCm(String(Math.round(feetInchesToCm(f || 0, i || 0) * 10) / 10));
  };

  return (
    <View className="gap-1.5">
      <Text variant="caption">Height</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField
            label="Feet"
            value={feet}
            onChangeText={(v) => {
              setFeet(v);
              commit(v, inches);
            }}
            keyboardType="numeric"
            placeholder="5"
          />
        </View>
        <View className="flex-1">
          <TextField
            label="Inches"
            value={inches}
            onChangeText={(v) => {
              setInches(v);
              commit(feet, v);
            }}
            keyboardType="numeric"
            placeholder="7"
          />
        </View>
      </View>
    </View>
  );
}
