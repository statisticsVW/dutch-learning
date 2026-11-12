import { DEFAULT_THEME, isThemeId, type ThemeId } from '../personalise/themes';

/** The Learner's own name for the app and his colour theme. Kept on his device only, never in the repository. */
export type Personalisation = { name: string; theme: ThemeId };

/** `load` gives `undefined` until the Learner has made his first choice. */
export type PersonalisationStore = { load(): Personalisation | undefined; save(personalisation: Personalisation): void };

export const PERSONALISATION_KEY = 'dutch-learning.personalisation';

/** Personalisation kept in the browser's storage, next to the progress (ADR 0001). */
export function createLocalPersonalisationStore(storage: Storage): PersonalisationStore {
  return {
    load() {
      const raw = storage.getItem(PERSONALISATION_KEY);
      return raw === null ? undefined : parsePersonalisation(raw);
    },
    save({ name, theme }) {
      storage.setItem(PERSONALISATION_KEY, JSON.stringify({ version: 1, name, theme }));
    },
  };
}

function parsePersonalisation(raw: string): Personalisation | undefined {
  try {
    const data = JSON.parse(raw);
    if (data && data.version === 1 && typeof data.name === 'string' && data.name.trim() !== '') {
      // A theme that has since been removed falls back to the default rather than asking again.
      return { name: data.name, theme: isThemeId(data.theme) ? data.theme : DEFAULT_THEME };
    }
  } catch {
    // fall through
  }
  // Losing a name and a colour is cheap: asking again is the recovery.
  return undefined;
}

/** In-memory fake for tests. */
export function createMemoryPersonalisationStore(initial?: Personalisation): PersonalisationStore {
  let current = initial && { ...initial };
  return {
    load: () => current && { ...current },
    save(personalisation) {
      current = { ...personalisation };
    },
  };
}
