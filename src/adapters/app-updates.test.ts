import { describe, expect, it, vi } from 'vitest';
import { createBrowserAppUpdates, type ServiceWorkerContainerLike, type VisibilityLike } from './app-updates';

/** A stand-in for navigator.serviceWorker: a new version taking over fires "controllerchange". */
function fakeContainer(controlled: boolean) {
  const listeners = new Set<() => void>();
  const update = vi.fn(() => Promise.resolve());
  const container = {
    controller: controlled ? ({} as ServiceWorker) : null,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    getRegistration: () => Promise.resolve({ update } as unknown as ServiceWorkerRegistration),
  } as unknown as ServiceWorkerContainerLike;
  const takeOver = () => listeners.forEach((l) => l());
  return { container, takeOver, update };
}

function fakePage() {
  let state: DocumentVisibilityState = 'visible';
  const listeners = new Set<() => void>();
  const page = {
    get visibilityState() {
      return state;
    },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  } as unknown as VisibilityLike;
  const show = (next: DocumentVisibilityState) => {
    state = next;
    listeners.forEach((l) => l());
  };
  return { page, show };
}

describe('app updates', () => {
  it('announces a new version when it takes over from the one this page started with', () => {
    const { container, takeOver } = fakeContainer(true);
    const updates = createBrowserAppUpdates(container, fakePage().page);
    const ready = vi.fn();
    updates.onReady(ready);

    takeOver();

    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('stays quiet on the very first install, when nothing was running the page before', () => {
    const { container, takeOver } = fakeContainer(false);
    const ready = vi.fn();
    createBrowserAppUpdates(container, fakePage().page).onReady(ready);

    takeOver();

    expect(ready).not.toHaveBeenCalled();
  });

  it('tells a listener that arrives late that an update is already waiting', () => {
    const { container, takeOver } = fakeContainer(true);
    const updates = createBrowserAppUpdates(container, fakePage().page);
    takeOver();

    const ready = vi.fn();
    updates.onReady(ready);

    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('checks for a new version when the app comes back from the background', async () => {
    const { container, update } = fakeContainer(true);
    const { page, show } = fakePage();
    createBrowserAppUpdates(container, page);

    show('hidden');
    show('visible');
    await Promise.resolve();
    await Promise.resolve();

    expect(update).toHaveBeenCalledTimes(1);
  });

  it('does nothing without service workers', () => {
    const ready = vi.fn();
    createBrowserAppUpdates(undefined, fakePage().page).onReady(ready);

    expect(ready).not.toHaveBeenCalled();
  });
});
