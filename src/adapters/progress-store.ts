import { emptyProgress, type Progress } from '../engine/engine';

export type ProgressStore = { load(): Progress; save(progress: Progress): void };

export const PROGRESS_KEY = 'dutch-learning.progress';

/** Progress kept in the browser's storage on the Learner's device (ADR 0001). */
export function createLocalProgressStore(storage: Storage): ProgressStore {
  return {
    load() {
      const raw = storage.getItem(PROGRESS_KEY);
      if (raw === null) return emptyProgress();
      const parsed = parseProgress(raw);
      if (parsed) return parsed;
      // Never silently lose data: park it where a later version (or a person) can recover it.
      storage.setItem(`${PROGRESS_KEY}.unreadable`, raw);
      return emptyProgress();
    },
    save(progress) {
      storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    },
  };
}

function parseProgress(raw: string): Progress | undefined {
  try {
    const data = JSON.parse(raw);
    if (data && data.version === 1 && typeof data.cards === 'object' && data.cards !== null) return data as Progress;
  } catch {
    // fall through
  }
  return undefined;
}

/** In-memory fake for tests. `saved` records every save, newest last. */
export function createMemoryProgressStore(initial: Progress = emptyProgress()): ProgressStore & { saved: Progress[] } {
  let current = structuredClone(initial);
  const saved: Progress[] = [];
  return {
    saved,
    load: () => structuredClone(current),
    save(progress) {
      current = structuredClone(progress);
      saved.push(current);
    },
  };
}
