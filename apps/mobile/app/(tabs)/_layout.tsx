import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useMe } from '../../src/hooks/useMe';
import { useAuthStore } from '../../src/state/authStore';

// Filled icon when active, outline when not — the active tab should pop
// (reference-app style), not just change tint.
const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'home', inactive: 'home-outline' },
  food: { active: 'restaurant', inactive: 'restaurant-outline' },
  progress: { active: 'trending-up', inactive: 'trending-up-outline' },
  coach: { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

function LoadingSplash() {
  return (
    <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
      <ActivityIndicator size="large" color="#12c06e" />
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
        tabBarActiveTintColor: '#0aa25c',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = ICONS[route.name];
          const name = icons ? (focused ? icons.active : icons.inactive) : 'ellipse-outline';
          return <Ionicons name={name} size={size} color={color} />;
        },
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
