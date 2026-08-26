import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Every tab screen has `headerShown: false`, so nothing else reserves space
 * for the status bar — without this, the first line of content renders
 * underneath it (worst on edge-to-edge Android, e.g. Android 15+, where the
 * OS no longer reserves that space for you). Kept as a plain sized View
 * rather than folded into a className/contentContainerClassName value,
 * since NativeWind's content-container prop mapping isn't reliable for
 * every component (see the FlatList contentContainerClassName issue on the
 * Coach screen) — this way there's no merge behavior to trust.
 */
export function TopInsetSpacer() {
  const insets = useSafeAreaInsets();
  return <View style={{ height: insets.top }} />;
}
