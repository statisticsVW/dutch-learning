/**
 * Install status: whether the aid runs as an installed Home Screen app or in a browser tab,
 * and whether the Learner has already seen the one-time "add to Home Screen" screen.
 *
 * iOS Safari wipes a tab's stored data after 7 days without use; installed apps are exempt (ADR 0001).
 */
export interface InstallStatus {
  isInstalled(): boolean;
  hasSeenInstallScreen(): boolean;
  markInstallScreenSeen(): void;
}

/** The slice of `window` the real implementation reads, so it can be exercised without a real iPhone. */
export interface InstallEnvironment {
  matchMedia(query: string): { matches: boolean };
  navigator: { standalone?: boolean };
  localStorage: Storage;
}

const SEEN_KEY = 'install-screen-seen';

export function browserInstallStatus(env: InstallEnvironment = window as unknown as InstallEnvironment): InstallStatus {
  return {
    isInstalled() {
      // iOS Safari exposes `navigator.standalone`; other browsers report the manifest's display mode.
      return env.navigator.standalone === true || env.matchMedia('(display-mode: standalone)').matches;
    },
    hasSeenInstallScreen() {
      try {
        return env.localStorage.getItem(SEEN_KEY) === 'yes';
      } catch {
        return false;
      }
    },
    markInstallScreenSeen() {
      try {
        env.localStorage.setItem(SEEN_KEY, 'yes');
      } catch {
        // Storage unavailable (e.g. private browsing): the screen will show again next time, which is harmless.
      }
    },
  };
}

/** In-memory fake for tests. */
export function fakeInstallStatus({
  installed = false,
  seenInstallScreen = false,
}: { installed?: boolean; seenInstallScreen?: boolean } = {}): InstallStatus {
  let seen = seenInstallScreen;
  return {
    isInstalled: () => installed,
    hasSeenInstallScreen: () => seen,
    markInstallScreenSeen: () => {
      seen = true;
    },
  };
}
