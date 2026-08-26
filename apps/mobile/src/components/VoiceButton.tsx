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
    </View>
  );
}
