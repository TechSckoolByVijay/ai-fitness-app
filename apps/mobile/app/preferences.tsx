import {
  MAX_INTENSITY_MULTIPLIER,
  MAX_UNIT_GRAMS,
  MIN_INTENSITY_MULTIPLIER,
  MIN_UNIT_GRAMS,
  type UserPreferenceDto,
} from '@fitness-app/shared';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Chip } from '../src/components/ui/Chip';
import { SkeletonBlock } from '../src/components/ui/SkeletonBlock';
import { Text } from '../src/components/ui/Text';
import { TextField } from '../src/components/ui/TextField';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import {
  useDeleteUserPreference,
  useUpsertUserPreference,
  useUserPreferences,
} from '../src/hooks/useUserPreferences';

/** The units people most often measure differently at home. */
const UNIT_SUGGESTIONS = ['scoop', 'bowl', 'katori', 'glass', 'plate', 'handful'];

const INTENSITY_PRESETS = [
  { label: 'Easier than average', multiplier: 0.75 },
  { label: 'Average', multiplier: 1 },
  { label: 'Harder than average', multiplier: 1.3 },
  { label: 'Much harder', multiplier: 1.6 },
];

function PreferenceRow({ pref, onDelete }: { pref: UserPreferenceDto; onDelete: () => void }) {
  const value =
    pref.kind === 'unit_weight' ? `${pref.grams} g` : `${pref.multiplier}× calories burned`;

  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800">
      <View className="flex-1">
        <Text variant="body" className="font-semibold capitalize">
          {pref.key}
        </Text>
        <Text variant="caption" className="text-gray-500 dark:text-gray-400">
          {value}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${pref.key}`} onPress={onDelete}>
        <Text className="text-sm font-semibold text-danger-600 dark:text-danger-400">Remove</Text>
      </Pressable>
    </View>
  );
}

/**
 * Everything the app has been told to remember, in one place.
 *
 * The screen exists because a preference that cannot be seen is worse than
 * none: it keeps being applied to every future entry, so a wrong one is a
 * number quietly wrong forever. Anything here can be removed, which returns
 * that unit or activity to the standard tables.
 */
export default function PreferencesScreen() {
  const isAuthenticated = useRequireAuth();
  const preferences = useUserPreferences();
  const upsert = useUpsertUserPreference();
  const remove = useDeleteUserPreference();

  const [unitKey, setUnitKey] = useState('');
  const [unitGrams, setUnitGrams] = useState('');
  const [activityKey, setActivityKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const report = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : 'Could not save that. Please try again.');

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#12c06e" />
      </View>
    );
  }

  const all = preferences.data?.preferences ?? [];
  const units = all.filter((p) => p.kind === 'unit_weight');
  const activities = all.filter((p) => p.kind === 'activity_intensity');

  const gramsValue = Number(unitGrams);
  const canSaveUnit =
    unitKey.trim().length > 0 &&
    Number.isFinite(gramsValue) &&
    gramsValue >= MIN_UNIT_GRAMS &&
    gramsValue <= MAX_UNIT_GRAMS;

  const saveUnit = () => {
    if (!canSaveUnit) return;
    setError(null);
    upsert.mutate(
      { kind: 'unit_weight', key: unitKey.trim(), grams: gramsValue },
      {
        onSuccess: () => {
          setUnitKey('');
          setUnitGrams('');
        },
        onError: report,
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-surface-light dark:bg-surface-dark" contentContainerClassName="gap-4 p-5 pb-10">
      {error ? (
        <Text variant="caption" className="text-danger-600 dark:text-danger-400">
          {error}
        </Text>
      ) : null}

      <Text variant="caption" className="text-gray-500 dark:text-gray-400">
        The app uses standard sizes unless you tell it otherwise. Anything set here is used for every
        future entry, and can be removed at any time.
      </Text>

      {preferences.isLoading ? (
        <SkeletonBlock className="h-48 w-full" />
      ) : (
        <>
          <Card>
            <Text variant="subtitle">Your measurements</Text>
            <Text variant="caption" className="mb-1 text-gray-500 dark:text-gray-400">
              A scoop is 32 g by default and a bowl 250 g. If yours differ, say so once.
            </Text>

            {units.length > 0 ? (
              <View className="mb-2">
                {units.map((pref) => (
                  <PreferenceRow
                    key={pref.id}
                    pref={pref}
                    onDelete={() =>
                      Alert.alert('Remove measurement', `Go back to the standard size for a ${pref.key}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => remove.mutate(pref.id, { onError: report }),
                        },
                      ])
                    }
                  />
                ))}
              </View>
            ) : null}

            <View className="mt-2 flex-row flex-wrap gap-2">
              {UNIT_SUGGESTIONS.map((unit) => (
                <Chip key={unit} label={unit} selected={unitKey === unit} onPress={() => setUnitKey(unit)} />
              ))}
            </View>

            <View className="mt-3 flex-row gap-3">
              <View className="flex-1">
                <TextField label="Unit" value={unitKey} onChangeText={setUnitKey} placeholder="scoop" />
              </View>
              <View className="flex-1">
                <TextField
                  label="Weighs (g)"
                  value={unitGrams}
                  onChangeText={setUnitGrams}
                  keyboardType="numeric"
                  placeholder="35"
                />
              </View>
            </View>
            <View className="mt-2">
              <Button label="Save measurement" onPress={saveUnit} disabled={!canSaveUnit} loading={upsert.isPending} />
            </View>
          </Card>

          <Card>
            <Text variant="subtitle">How hard you train</Text>
            <Text variant="caption" className="mb-1 text-gray-500 dark:text-gray-400">
              Calorie burn is based on population averages. If your sessions are harder or easier than
              typical, adjust it — this changes what an activity is worth, not how long you did it.
            </Text>

            {activities.length > 0 ? (
              <View className="mb-2">
                {activities.map((pref) => (
                  <PreferenceRow
                    key={pref.id}
                    pref={pref}
                    onDelete={() => remove.mutate(pref.id, { onError: report })}
                  />
                ))}
              </View>
            ) : null}

            <TextField
              label="Activity (or leave blank for all)"
              value={activityKey}
              onChangeText={setActivityKey}
              placeholder="gym"
            />

            <View className="mt-3 gap-2">
              {INTENSITY_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  label={`${preset.label} (${preset.multiplier}×)`}
                  variant="secondary"
                  loading={upsert.isPending}
                  onPress={() => {
                    setError(null);
                    upsert.mutate(
                      {
                        kind: 'activity_intensity',
                        // Blank means "everything" — stored under a reserved key
                        // the server falls back to when no activity matches.
                        key: activityKey.trim() || 'default',
                        multiplier: Math.min(
                          Math.max(preset.multiplier, MIN_INTENSITY_MULTIPLIER),
                          MAX_INTENSITY_MULTIPLIER,
                        ),
                      },
                      { onSuccess: () => setActivityKey(''), onError: report },
                    );
                  }}
                />
              ))}
            </View>
          </Card>

          <Text variant="caption" className="text-gray-500 dark:text-gray-400">
            These only affect entries you log from now on. Anything already logged keeps the numbers it
            was saved with.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
