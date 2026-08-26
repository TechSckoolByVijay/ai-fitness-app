import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { SkeletonBlock } from '../../src/components/ui/SkeletonBlock';
import { Text } from '../../src/components/ui/Text';
import { TopInsetSpacer } from '../../src/components/ui/TopInsetSpacer';
import { RemindersCard } from '../../src/components/RemindersCard';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { useLogout } from '../../src/hooks/useAuth';
import { useMe } from '../../src/hooks/useMe';

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

  return (
    <ScrollView className="flex-1 bg-white dark:bg-surface-dark" contentContainerClassName="gap-5 p-5">
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

          <Card>
            <Text variant="subtitle" className="mb-2">
              Settings
            </Text>
            <Row label="Health integrations" value="Coming soon" />
            <Row label="Privacy & data export" value="Coming soon" />
          </Card>

          <Button label="Log out" variant="secondary" onPress={() => logout.mutate()} loading={logout.isPending} />
        </>
      )}
    </ScrollView>
  );
}
