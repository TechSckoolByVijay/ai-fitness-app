import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../state/authStore';

/**
 * Root-level routes (log-meal, meal/[id]) aren't nested under (tabs) or
 * (onboarding), so they don't get those groups' auth-gate redirects for
 * free. If the session goes invalid while the user is on one of these
 * screens (expired token, failed silent refresh), send them to login
 * instead of leaving them stranded on a screen that can only 401.
 */
export function useRequireAuth(): boolean {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status]);

  return status === 'authenticated';
}
