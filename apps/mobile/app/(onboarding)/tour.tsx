import { router } from 'expo-router';
import { View } from 'react-native';
import { OnboardingScaffold } from '../../src/components/onboarding/OnboardingScaffold';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';

const HIGHLIGHTS = [
  {
    emoji: '🎙️',
    title: 'Just talk to log',
    body: 'Tap the mic anytime and say what you ate or did — "I had 2 eggs and toast." No forms to fill in.',
  },
  {
    emoji: '📅',
    title: 'Catching up later? No problem',
    body: 'Say "breakfast was milk and a banana, lunch was rice and dal" and we\'ll split it out for you.',
  },
  {
    emoji: '📊',
    title: 'See your progress at a glance',
    body: 'Your Home screen shows simple bars for how you\'re tracking today — no spreadsheets to read.',
  },
  {
    emoji: '🔔',
    title: "We'll remind you",
    body: 'Turn on reminders from your Profile so you never forget to log a meal or drink water.',
  },
];

export default function TourStep() {
  return (
    <OnboardingScaffold
      step={7}
      title="You're all set — here's the quick version"
      subtitle="Four things worth knowing before you dive in."
      footer={<Button label="Let's go" onPress={() => router.replace('/')} />}
    >
      <View className="gap-5">
        {HIGHLIGHTS.map((item) => (
          <View key={item.title} className="flex-row gap-3">
            <Text className="text-3xl">{item.emoji}</Text>
            <View className="flex-1">
              <Text variant="body" className="font-semibold">
                {item.title}
              </Text>
              <Text variant="caption" className="mt-0.5">
                {item.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
