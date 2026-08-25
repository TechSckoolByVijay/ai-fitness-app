import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from './ui/Text';

export function VoiceButton() {
  return (
    <View className="items-center gap-2 px-6 pb-2 pt-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tell me what you ate or did"
        onPress={() => router.push('/log-meal')}
        className="h-20 w-20 items-center justify-center rounded-full bg-primary-500 shadow-lg active:bg-primary-600"
      >
        <Text className="text-4xl">🎙️</Text>
      </Pressable>
      <Text variant="caption" className="font-medium">
        Tell me what you ate or did
      </Text>
    </View>
  );
}
