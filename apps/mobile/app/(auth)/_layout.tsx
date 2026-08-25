import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/state/authStore';

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'authenticated') {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
