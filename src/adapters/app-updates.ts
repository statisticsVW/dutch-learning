// Noticing that a new version of the app has arrived, so the Learner can switch to it with one tap.
// The service worker (pwa/service-worker.ts) installs each deploy in the background and takes over
// at once, but the page that is already open keeps running the old code until it reloads.

export type AppUpdates = {
  /** Calls `listener` once a new version is ready (straight away if it already is). Returns an unsubscribe. */
  onReady(listener: () => void): () => void;
};

export type ServiceWorkerContainerLike = Pick<ServiceWorkerContainer, 'controller' | 'addEventListener' | 'removeEventListener' | 'getRegistration'>;
export type VisibilityLike = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;

export function createBrowserAppUpdates(container: ServiceWorkerContainerLike | undefined, page: VisibilityLike): AppUpdates {
  const listeners = new Set<() => void>();
  let ready = false;

  if (container) {
    // On the very first visit nothing controls the page yet, and the first takeover is just the install.
    let controlled = container.controller !== null;
    container.addEventListener('controllerchange', () => {
      if (!controlled) {
        controlled = true;
        return;
      }
      ready = true;
      listeners.forEach((listener) => listener());
    });

    // An installed app is usually brought back from the background rather than reopened, and the browser
    // only looks for a new version on a real load. So look again whenever the app comes back.
    page.addEventListener('visibilitychange', () => {
      if (page.visibilityState !== 'visible') return;
      container
        .getRegistration()
        .then((registration) => registration?.update())
        .catch(() => {
          // Offline, or the check failed: the next visit will try again.
        });
    });
  }

  return {
    onReady(listener) {
      if (ready) listener();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type FakeAppUpdates = AppUpdates & { announce(): void };

export function createFakeAppUpdates(): FakeAppUpdates {
  const listeners = new Set<() => void>();
  let ready = false;
  return {
    onReady(listener) {
      if (ready) listener();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    announce() {
      ready = true;
      listeners.forEach((listener) => listener());
    },
  };
}
