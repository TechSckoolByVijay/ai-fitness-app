import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

/** expo-image-picker's `base64` result is always JPEG-encoded regardless of source format (documented behavior). */
function toDataUri(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}

async function captureFromCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera access needed', 'Allow camera access in your device settings to log a meal by photo.');
    return null;
  }

  // 0.5 quality keeps the upload small/fast without visibly hurting the
  // model's ability to identify food — this is a vision API call, not a
  // photo you'd zoom into.
  const result = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true, mediaTypes: ['images'] });
  if (result.canceled || !result.assets?.[0]?.base64) return null;
  return toDataUri(result.assets[0].base64);
}

async function captureFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photo access needed', 'Allow photo library access in your device settings to log a meal by photo.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: true, mediaTypes: ['images'] });
  if (result.canceled || !result.assets?.[0]?.base64) return null;
  return toDataUri(result.assets[0].base64);
}

/**
 * Prompts the user to take a new photo or pick an existing one, and returns
 * the result as a base64 data URI ready for the API — or null if they
 * canceled or permission was denied. Web has no camera/library picker
 * distinction worth making, so it skips straight to the library there.
 */
export function pickMealPhoto(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return captureFromLibrary();
  }

  return new Promise((resolve) => {
    Alert.alert('Log a meal from a photo', 'Take a new photo or choose one from your gallery.', [
      { text: 'Take Photo', onPress: () => void captureFromCamera().then(resolve) },
      { text: 'Choose from Gallery', onPress: () => void captureFromLibrary().then(resolve) },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
