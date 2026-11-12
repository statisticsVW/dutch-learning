import { beforeEach, describe, expect, it } from 'vitest';
import { browserInstallStatus, type InstallEnvironment } from './installStatus';

function environment({
  standaloneDisplay = false,
  iosStandalone,
  storage = window.localStorage,
}: { standaloneDisplay?: boolean; iosStandalone?: boolean; storage?: Storage } = {}): InstallEnvironment {
  return {
    matchMedia: (query: string) => ({ matches: standaloneDisplay && query === '(display-mode: standalone)' }),
    navigator: iosStandalone === undefined ? {} : { standalone: iosStandalone },
    localStorage: storage,
  };
}

const brokenStorage = {
  getItem() {
    throw new Error('storage disabled');
  },
  setItem() {
    throw new Error('storage disabled');
  },
} as unknown as Storage;

describe('browserInstallStatus', () => {
  beforeEach(() => window.localStorage.clear());

  it('is not installed in an ordinary browser tab', () => {
    expect(browserInstallStatus(environment()).isInstalled()).toBe(false);
    expect(browserInstallStatus(environment({ iosStandalone: false })).isInstalled()).toBe(false);
  });

  it('is installed when opened from the iPhone Home Screen', () => {
    expect(browserInstallStatus(environment({ iosStandalone: true })).isInstalled()).toBe(true);
  });

  it('is installed when the browser reports standalone display mode', () => {
    expect(browserInstallStatus(environment({ standaloneDisplay: true })).isInstalled()).toBe(true);
  });

  it('remembers that the install screen was seen, across reloads', () => {
    expect(browserInstallStatus(environment()).hasSeenInstallScreen()).toBe(false);

    browserInstallStatus(environment()).markInstallScreenSeen();

    expect(browserInstallStatus(environment()).hasSeenInstallScreen()).toBe(true);
  });

  it('treats unavailable storage as not seen, without throwing', () => {
    const status = browserInstallStatus(environment({ storage: brokenStorage }));

    expect(() => status.markInstallScreenSeen()).not.toThrow();
    expect(status.hasSeenInstallScreen()).toBe(false);
  });
});
