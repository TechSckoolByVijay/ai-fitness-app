import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ApiError } from '../api/client';
import { useGoogleSignIn } from '../hooks/useAuth';
import { isGoogleSignInAvailable } from '../lib/googleSignIn';
import { Text } from './ui/Text';

/**
 * Renders nothing when the build has no native Google module (Expo Go) or no
 * client id configured — a button that cannot work is worse than no button.
 */
export function GoogleSignInButton() {
  const googleSignIn = useGoogleSignIn();
  const [error, setError] = useState<string | null>(null);

  if (!isGoogleSignInAvailable()) return null;

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <Text variant="caption" className="text-gray-400 dark:text-gray-500">
          or
        </Text>
        <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        disabled={googleSignIn.isPending}
        onPress={() => {
          setError(null);
          googleSignIn.mutate(undefined, {
            onError: (err) =>
              setError(
                err instanceof ApiError
                  ? err.message
                  : err instanceof Error
                    ? err.message
                    : 'Google sign-in failed. Please try again.',
              ),
          });
        }}
        className={`flex-row items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3.5 dark:border-gray-600 dark:bg-muted-dark ${
          googleSignIn.isPending ? 'opacity-60' : ''
        }`}
      >
        {/* Google's brand guidelines ask for their mark; a lettered glyph is
            a stand-in until the asset is added. */}
        <Text className="text-lg font-bold text-[#4285F4]">G</Text>
        <Text variant="body" className="font-semibold text-gray-800 dark:text-gray-100">
          {googleSignIn.isPending ? 'Signing in…' : 'Continue with Google'}
        </Text>
      </Pressable>

      {error ? (
        <Text variant="caption" className="text-danger-600 dark:text-danger-400">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
