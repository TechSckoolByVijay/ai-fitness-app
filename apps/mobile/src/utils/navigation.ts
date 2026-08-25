import { router } from 'expo-router';

/**
 * router.back() throws "action 'GO_BACK' was not handled" when there's no
 * history to go back to — e.g. the user landed directly on a modal route
 * (typed/bookmarked URL) rather than navigating from within the app. Falls
 * back to the Home tab instead of leaving the user stranded.
 */
export function goBackOrHome(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
