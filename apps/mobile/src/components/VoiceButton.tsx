import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { usePendingPhotoStore } from '../state/pendingPhoto';
import { pickMealPhoto } from '../utils/mealPhoto';
import { Text } from './ui/Text';

export function VoiceButton() {
  const setPendingPhoto = usePendingPhotoStore((s) => s.setPendingPhoto);

  const startPhotoLog = async () => {
    const imageBase64 = await pickMealPhoto();
    if (!imageBase64) return;
    setPendingPhoto(imageBase64);
    router.push('/log-meal');
  };

  return (
    <View className="flex-row items-end justify-center gap-8 px-6 pb-2 pt-4">
      <View className="items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log a meal from a photo"
          onPress={() => void startPhotoLog()}
          className="h-14 w-14 items-center justify-center rounded-full bg-muted-light shadow active:opacity-80 dark:bg-muted-dark"
        >
          <Text className="text-2xl">📷</Text>
        </Pressable>
        <Text variant="caption">Photo</Text>
      </View>

      <View className="items-center gap-2">
        <View className="items-center justify-center">
          <View className="absolute h-32 w-32 rounded-full bg-primary-500/15 dark:bg-primary-400/20" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tell me what you ate or did"
            onPress={() => router.push('/log-meal')}
            className="h-24 w-24 items-center justify-center rounded-full bg-primary-500 shadow-xl active:bg-primary-600"
          >
            <Text className="text-5xl">🎙️</Text>
          </Pressable>
        </View>
        <Text variant="caption" className="text-sm font-semibold text-primary-600 dark:text-primary-400">
          Tell me what you ate or did
        </Text>
      </View>
    </View>
  );
}
