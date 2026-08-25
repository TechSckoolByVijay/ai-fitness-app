import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/state/authStore';

export default function OnboardingLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
