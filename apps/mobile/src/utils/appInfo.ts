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

export interface UpdateCheckResult {
  status: 'up-to-date' | 'updated' | 'unsupported' | 'error';
  detail: string;
}

/**
 * Explicit, user-triggered alternative to the native auto-check-on-launch —
 * added after a real case where the auto-check silently never applied
 * several published updates and "close the app a few times" gave no way to
 * tell why. This turns that into an observable result (a specific status +
 * detail message) instead of a black box, and applies the update
 * immediately via a reload rather than waiting for yet another manual
 * relaunch.
 */
/**
 * Neither the check nor the download can be allowed to run forever. A stalled
 * fetch previously left the UI on a spinner indefinitely, and could leave a
 * partially-applied update behind that bricked the app on next launch.
 */
const UPDATE_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out. Check your connection and try again.`)), ms);
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export async function checkForUpdate(timeoutMs: number = UPDATE_TIMEOUT_MS): Promise<UpdateCheckResult> {
  if (Updates.isEmbeddedLaunch && !Updates.channel) {
    // Running in a context expo-updates isn't wired up in at all (e.g. Expo Go).
    return { status: 'unsupported', detail: 'Updates are not available in this environment.' };
  }
  try {
    const result = await withTimeout(Updates.checkForUpdateAsync(), timeoutMs, 'Checking for updates');
    if (!result.isAvailable) {
      return { status: 'up-to-date', detail: "You're already on the latest version." };
    }

    const fetched = await withTimeout(Updates.fetchUpdateAsync(), timeoutMs, 'Downloading the update');

    // Only report success when a NEW bundle actually landed. The previous
    // version discarded this result and reported 'updated' regardless, so the
    // caller reloaded even when nothing usable had been downloaded — which is
    // how devices ended up stuck on a loading screen.
    if (!fetched.isNew) {
      return { status: 'up-to-date', detail: "You're already on the latest version." };
    }

    return { status: 'updated', detail: 'Update downloaded — restarting the app now.' };
  } catch (error) {
    return {
      status: 'error',
      detail: error instanceof Error ? error.message : 'Could not reach the update server.',
    };
  }
}
