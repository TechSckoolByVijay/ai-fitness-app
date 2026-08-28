import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Alert, Platform, ScrollView, Share, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { SkeletonBlock } from '../../src/components/ui/SkeletonBlock';
import { Text } from '../../src/components/ui/Text';
import { TextField } from '../../src/components/ui/TextField';
import { TopInsetSpacer } from '../../src/components/ui/TopInsetSpacer';
import { RemindersCard } from '../../src/components/RemindersCard';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { useDeleteAccount, useLogout } from '../../src/hooks/useAuth';
import { useMe } from '../../src/hooks/useMe';
import { checkForUpdate, getAppInfo } from '../../src/utils/appInfo';

function alertAsync(title: string, message: string): void {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-gray-100 py-2.5 last:border-b-0 dark:border-gray-800">
      <Text variant="caption">{label}</Text>
      <Text variant="body" className="capitalize">
        {value}
      </Text>
    </View>
  );
}

function CardHeader({ title, onEdit }: { title: string; onEdit: () => void }) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text variant="subtitle">{title}</Text>
      <Button label="Edit" variant="ghost" onPress={onEdit} />
    </View>
  );
}

export default function ProfileScreen() {
  const me = useMe();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const appInfo = getAppInfo();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const handleCheckForUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateMessage(null);
    const result = await checkForUpdate();
    if (result.status === 'updated') {
      await Updates.reloadAsync();
      return;
    }
    setIsCheckingUpdate(false);
    setUpdateMessage(result.detail);
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message:
          "I've been using Fitness Coach — you just *say* what you ate and it tracks calories, protein and everything for you. Free, no ads. Get it here: https://github.com/TechSckoolByVijay/ai-fitness-app/releases/latest",
      });
    } catch {
      // Share sheet dismissed or unavailable — nothing to do.
    }
  };

  const handleDeleteAccount = () => {
    deleteAccount.mutate(
      { password: deletePassword },
      {
        onError: (error) => {
          alertAsync(
            'Could not delete account',
            error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
          );
        },
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-surface-light dark:bg-surface-dark" contentContainerClassName="gap-5 p-5">
      <TopInsetSpacer />
      <Text variant="title">Profile</Text>

      <ThemeToggle />

      {me.isLoading || !me.data ? (
        <SkeletonBlock className="h-64 w-full" />
      ) : (
        <>
          <Card>
            <Text variant="subtitle" className="mb-2">
              Account
            </Text>
            <Row label="Name" value={me.data.name} />
            <Row label="Email" value={me.data.email} />
          </Card>

          <Card>
            <CardHeader title="Body info" onEdit={() => router.push('/edit-body-info')} />
            <Row label="Height" value={me.data.profile.heightCm ? `${me.data.profile.heightCm} cm` : '—'} />
            <Row label="Current weight" value={me.data.profile.currentWeightKg ? `${me.data.profile.currentWeightKg} kg` : '—'} />
            <Row label="Target weight" value={me.data.profile.targetWeightKg ? `${me.data.profile.targetWeightKg} kg` : '—'} />
            <Row label="Activity level" value={me.data.profile.activityLevel?.replace('_', ' ') ?? '—'} />
            <Row label="Calorie target" value={me.data.profile.calorieTarget ? `${me.data.profile.calorieTarget} kcal` : '—'} />
            <Row label="Protein target" value={me.data.profile.proteinTarget ? `${me.data.profile.proteinTarget} g` : '—'} />
          </Card>

          <Card>
            <CardHeader title="Goal" onEdit={() => router.push('/edit-goals')} />
            <Row
              label="Primary goal"
              value={me.data.goals.find((g) => g.isPrimary)?.type.replace('_', ' ') ?? '—'}
            />
          </Card>

          <Card>
            <CardHeader title="Diet" onEdit={() => router.push('/edit-diet')} />
            <Row label="Diet" value={me.data.dietPreference?.dietType.replace('_', ' ') ?? '—'} />
          </Card>

          <Card>
            <CardHeader title="Allergies" onEdit={() => router.push('/edit-allergies')} />
            <Row
              label="Allergies"
              value={me.data.allergies.length ? me.data.allergies.map((a) => a.type).join(', ') : 'None'}
            />
          </Card>

          <Card>
            <CardHeader title="Health conditions" onEdit={() => router.push('/edit-health-conditions')} />
            <Row
              label="Conditions"
              value={
                me.data.healthConditions.length
                  ? me.data.healthConditions.map((c) => c.type.replace('_', ' ')).join(', ')
                  : 'None'
              }
            />
          </Card>

          <RemindersCard />

          <Card className="bg-primary-50 dark:bg-primary-900/30">
            <Text variant="subtitle" className="text-primary-800 dark:text-primary-200">
              Enjoying Fitness Coach? 💚
            </Text>
            <Text variant="caption" className="mt-1 text-primary-700/80 dark:text-primary-300/80">
              Share it with a friend who&apos;s working on their health too.
            </Text>
            <Button label="Share with friends" onPress={() => void handleShareApp()} className="mt-3" />
          </Card>

          <Card>
            <Text variant="subtitle" className="mb-2">
              Settings
            </Text>
            <Row label="Health integrations" value="Coming soon" />
            <Row label="Privacy & data export" value="Coming soon" />
          </Card>

          <Button label="Log out" variant="secondary" onPress={() => logout.mutate()} loading={logout.isPending} />

          <Card className="gap-3 border border-red-100 dark:border-red-900/40">
            <Text variant="subtitle" className="text-red-600 dark:text-red-400">
              Danger zone
            </Text>
            {!showDeleteConfirm ? (
              <Button label="Delete account" variant="ghost" onPress={() => setShowDeleteConfirm(true)} />
            ) : (
              <View className="gap-3">
                <Text variant="caption">
                  This permanently deletes your account and all your logged meals, activities, and history. This
                  can&apos;t be undone.
                </Text>
                <TextField
                  label="Confirm your password"
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <View className="flex-row gap-3">
                  <Button
                    label="Delete permanently"
                    variant="ghost"
                    onPress={handleDeleteAccount}
                    loading={deleteAccount.isPending}
                    disabled={!deletePassword}
                    className="flex-1"
                  />
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                    }}
                  />
                </View>
              </View>
            )}
          </Card>

          <Card>
            <Text variant="subtitle" className="mb-2">
              About
            </Text>
            <Row label="App version" value={appInfo.version} />
            <Row label="Update" value={appInfo.updateSource} />
            <Row label="Channel" value={appInfo.channel} />
            <View className="mt-3 gap-2">
              <Button
                label="Check for updates"
                variant="secondary"
                loading={isCheckingUpdate}
                onPress={() => void handleCheckForUpdate()}
              />
              {updateMessage ? (
                <Text variant="caption" className="text-center">
                  {updateMessage}
                </Text>
              ) : null}
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}
