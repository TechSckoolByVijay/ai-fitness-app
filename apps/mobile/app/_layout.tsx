import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '../src/api/client';
import { useAuthStore } from '../src/state/authStore';
import { useThemeStore } from '../src/state/themeStore';

/**
 * Tapping the meal-logging reminder should drop the user straight into
 * log-meal instead of just opening to Home — the whole point of the nudge is
 * to make logging a one-tap action. Other reminder categories (water, sleep)
 * already have a one-tap quick-add on Home, so they don't need this.
 */
function useNotificationTapRouting(): void {
  useEffect(() => {
    function handleResponse(response: Notifications.NotificationResponse): void {
      const category = response.notification.request.content.data?.category;
      if (category === 'goal_progress') {
        router.push('/log-meal');
      }
    }

    // Covers a tap that arrives while the app is already running.
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    // Covers a cold start caused by the tap itself.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    return () => subscription.remove();
  }, []);
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  // 4xx errors (bad request, unauthorized, not found, ...) won't fix
  // themselves on retry — only worth retrying transient network/5xx failures,
  // and only a couple of times.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: shouldRetry },
          mutations: { retry: false },
        },
      }),
  );
  const hydrate = useAuthStore((s) => s.hydrate);
  const status = useAuthStore((s) => s.status);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    void hydrate();
    void hydrateTheme();
  }, [hydrate, hydrateTheme]);

  useNotificationTapRouting();

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#12c06e" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="log-meal"
            options={{ presentation: 'modal', headerShown: true, title: 'Log food or activity' }}
          />
          <Stack.Screen
            name="log-weight"
            options={{ presentation: 'modal', headerShown: true, title: 'Log weight' }}
          />
          <Stack.Screen
            name="log-sleep"
            options={{ presentation: 'modal', headerShown: true, title: 'Log sleep' }}
          />
          <Stack.Screen
            name="budget"
            options={{ presentation: 'modal', headerShown: true, title: 'Calorie budget' }}
          />
          <Stack.Screen
            name="units"
            options={{ presentation: 'modal', headerShown: true, title: 'Units' }}
          />
          <Stack.Screen
            name="reminders"
            options={{ presentation: 'modal', headerShown: true, title: 'Reminders' }}
          />
          <Stack.Screen
            name="edit-body-info"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit body info' }}
          />
          <Stack.Screen
            name="edit-goals"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit goal' }}
          />
          <Stack.Screen
            name="edit-diet"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit diet' }}
          />
          <Stack.Screen
            name="edit-allergies"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit allergies' }}
          />
          <Stack.Screen
            name="edit-health-conditions"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit health conditions' }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
