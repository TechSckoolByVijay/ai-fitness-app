import { router } from 'expo-router';
import { View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { useMe } from '../../src/hooks/useMe';

export default function AccountStep() {
  const me = useMe();

  return (
    <OnboardingScaffold
      step={1}
      title={`Welcome${me.data?.name ? `, ${me.data.name.split(' ')[0]}` : ''} 👋`}
      subtitle="Let's set up your profile — this only takes a couple of minutes, and you can always change things later."
      footer={<Button label="Get started" onPress={() => router.push('/body-info')} />}
    >
      <View className="gap-3">
        <Text variant="body">We&apos;ll ask a few quick questions about:</Text>
        <Text variant="body">• Your body and activity level</Text>
        <Text variant="body">• Your primary health goal</Text>
        <Text variant="body">• Your dietary preferences</Text>
        <Text variant="body">• Any allergies or health considerations</Text>
      </View>
    </OnboardingScaffold>
  );
}
