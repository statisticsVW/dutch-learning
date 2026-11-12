import type { DictionaryEntry } from '../content/types';

/** The Learner's Mijn woorden: the Dictionary entries he added, oldest first. */
export type MyWordsStore = { load(): DictionaryEntry[]; save(words: DictionaryEntry[]): void };

export const MY_WORDS_KEY = 'dutch-learning.mijn-woorden';

/**
 * Mijn woorden kept in the browser's storage on the Learner's device (ADR 0001), under its own key
 * so the progress format is untouched. Whole entries are kept, not just ids, so Mijn woorden works
 * without loading the Dictionary; the Dictionary screen refreshes them when the Curator corrects a word.
 */
export function createLocalMyWordsStore(storage: Storage): MyWordsStore {
  return {
    load() {
      const raw = storage.getItem(MY_WORDS_KEY);
      if (raw === null) return [];
      const parsed = parseMyWords(raw);
      if (parsed) return parsed;
      // Never silently lose data: park it where a later version (or a person) can recover it.
      storage.setItem(`${MY_WORDS_KEY}.unreadable`, raw);
      return [];
    },
    save(words) {
      storage.setItem(MY_WORDS_KEY, JSON.stringify({ version: 1, words }));
    },
  };
}

function parseMyWords(raw: string): DictionaryEntry[] | undefined {
  try {
    const data = JSON.parse(raw);
    if (data && data.version === 1 && Array.isArray(data.words)) return data.words as DictionaryEntry[];
  } catch {
    // fall through
  }
  return undefined;
}

/** In-memory fake for tests. `saved` records every save, newest last. */
export function createMemoryMyWordsStore(initial: DictionaryEntry[] = []): MyWordsStore & { saved: DictionaryEntry[][] } {
  let current = structuredClone(initial);
  const saved: DictionaryEntry[][] = [];
  return {
    saved,
    load: () => structuredClone(current),
    save(words) {
      current = structuredClone(words);
      saved.push(current);
    },
  };
}
