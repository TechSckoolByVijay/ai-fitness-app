import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

export interface AppInfo {
  version: string;
  channel: string;
  runtimeVersion: string;
  updateSource: string;
}

function formatDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Surfaces exactly what build/update the user is currently running, so "is
 * my app up to date" never again has to be diagnosed blind over chat (see
 * the moto g54 case where the installed APK silently predated the feature
 * being asked about). Reads only already-linked native modules
 * (expo-constants, expo-updates) so this itself ships via OTA with no
 * rebuild. Never throws — a missing/unexpected field falls back to
 * "unknown" rather than breaking the Profile screen.
 */
export function getAppInfo(): AppInfo {
  try {
    const version = Constants.expoConfig?.version ?? 'unknown';
    const channel = typeof Updates.channel === 'string' && Updates.channel ? Updates.channel : 'none';
    const runtimeVersion =
      typeof Updates.runtimeVersion === 'string' && Updates.runtimeVersion ? Updates.runtimeVersion : 'unknown';

    const updateSource = Updates.isEmbeddedLaunch
      ? 'Built-in (no update applied)'
      : `OTA update from ${formatDate(Updates.createdAt) ?? 'unknown time'}`;

    return { version, channel, runtimeVersion, updateSource };
  } catch {
    return { version: 'unknown', channel: 'unknown', runtimeVersion: 'unknown', updateSource: 'unknown' };
  }
}
