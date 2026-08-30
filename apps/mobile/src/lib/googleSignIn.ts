/**
 * Native Google Sign-In.
 *
 * The module is loaded through a guarded require rather than a static import
 * because it only exists in a build that includes the native module — a
 * static import would break the bundle in Expo Go before any of this ran.
 * Everything degrades to "unavailable" instead, so the login screen simply
 * hides the button rather than crashing.
 */

interface GoogleSignInModule {
  GoogleSignin: {
    configure: (options: { webClientId: string; offlineAccess?: boolean }) => void;
    hasPlayServices: (options?: { showPlayServicesUpdateDialog?: boolean }) => Promise<boolean>;
    signIn: () => Promise<unknown>;
    signOut: () => Promise<void>;
  };
  statusCodes: Record<string, string>;
}

/**
 * The WEB client id, not the Android one. The native library exchanges it for
 * an ID token whose audience is this value — the Android client authorises
 * the app by package name and signing fingerprint, but never appears in the
 * token. Getting these two the wrong way round yields a token the server
 * rejects on audience.
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

function loadModule(): GoogleSignInModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  } catch {
    return null;
  }
}

let configured = false;

/** Whether this build can offer Google sign-in at all. */
export function isGoogleSignInAvailable(): boolean {
  return loadModule() !== null && WEB_CLIENT_ID !== '';
}

/**
 * Runs the native sign-in flow and returns the ID token for the server to
 * verify. Returns null when the user simply backs out, which is not an error
 * worth showing them.
 */
export async function signInWithGoogle(): Promise<string | null> {
  const module = loadModule();
  if (!module || !WEB_CLIENT_ID) {
    throw new Error('Google sign-in is not available in this build.');
  }

  const { GoogleSignin } = module;
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    configured = true;
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = (await GoogleSignin.signIn()) as {
    type?: string;
    data?: { idToken?: string | null };
    idToken?: string | null;
  };

  // v13+ returns { type: 'cancelled' | 'success', data }, older versions
  // returned the user object directly — handle both so an upgrade of the
  // library does not silently stop returning a token.
  if (result?.type === 'cancelled') return null;
  const idToken = result?.data?.idToken ?? result?.idToken ?? null;

  if (!idToken) {
    throw new Error('Google did not return a sign-in token. Please try again.');
  }
  return idToken;
}

/** Clears the native session so the account picker appears again next time. */
export async function signOutFromGoogle(): Promise<void> {
  const module = loadModule();
  if (!module) return;
  try {
    await module.GoogleSignin.signOut();
  } catch {
    // Signing out of Google is best-effort — never block app logout on it.
  }
}
