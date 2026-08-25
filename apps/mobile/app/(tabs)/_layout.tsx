import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useMe } from '../../src/hooks/useMe';
import { useAuthStore } from '../../src/state/authStore';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  food: 'restaurant-outline',
  progress: 'trending-up-outline',
  coach: 'chatbubble-ellipses-outline',
  profile: 'person-outline',
};

function LoadingSplash() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-surface-dark">
      <ActivityIndicator size="large" color="#22b56d" />
    </View>
  );
}

export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);
  const me = useMe();

  if (status === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  if (me.isLoading) {
    return <LoadingSplash />;
  }

  if (me.data && !me.data.profile.onboardingCompletedAt) {
    return <Redirect href="/account" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#159157',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name] ?? 'ellipse-outline'} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="food" options={{ title: 'Food' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
