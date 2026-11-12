import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';
import type { Personalisation, PersonalisationStore } from '../adapters/personalisation-store';
import { DEFAULT_THEME, THEMES, type ThemeId } from './themes';
import { BackupSection, type BackupDeps } from '../backup/BackupSection';
import type { Backup } from '../backup/backup';

const FALLBACK_NAME = 'Dutch';
const MAX_NAME_LENGTH = 30;

/**
 * Wraps the app: on first launch the Learner names the app and picks a colour theme; after that the
 * app shows under a header with his chosen name and a way into settings to change either.
 * With `backup`, settings can also save a backup file and load one back.
 */
export function PersonaliseGate({ store, backup, children }: { store: PersonalisationStore; backup?: BackupDeps; children: ComponentChildren }) {
  const [chosen, setChosen] = useState(() => store.load());
  const [inSettings, setInSettings] = useState(false);
  /** Counts loaded backups: a new count restarts the app on the restored progress. */
  const [restores, setRestores] = useState(0);
  const [justRestored, setJustRestored] = useState(false);

  // Layout effect: apply the saved theme before the first paint, so the default colours never flash.
  useLayoutEffect(() => {
    if (chosen) applyPersonalisation(chosen);
  }, [chosen]);

  const save = (personalisation: Personalisation) => {
    store.save(personalisation);
    setChosen(personalisation);
    setInSettings(false);
  };

  const restored = (loaded: Backup) => {
    setChosen(loaded.personalisation);
    setRestores((n) => n + 1);
    setJustRestored(true);
    setInSettings(false);
  };
  const openSettings = () => {
    setJustRestored(false);
    setInSettings(true);
  };

  if (!chosen) {
    return (
      <main class="personalise">
        <h1>Make it yours</h1>
        <p>Give your Dutch app a name and pick its colours. You can change both later in Settings.</p>
        <PersonaliseForm initial={{ name: '', theme: DEFAULT_THEME }} submitLabel="Start" onSubmit={save} />
      </main>
    );
  }

  return (
    <>
      <header class="app-header">
        <h1>{chosen.name}</h1>
        {!inSettings && (
          <button type="button" class="quiet" onClick={openSettings}>
            Settings
          </button>
        )}
      </header>
      {inSettings && (
        <main class="personalise">
          <h2>Settings</h2>
          <PersonaliseForm initial={chosen} submitLabel="Save" onSubmit={save} onCancel={() => setInSettings(false)} />
          {backup && <BackupSection {...backup} personalisation={store} onRestored={restored} />}
        </main>
      )}
      {justRestored && (
        <p class="notice" role="status">
          Backup loaded.
        </p>
      )}
      {/* Kept mounted while in settings, so a Burst in progress carries on afterwards. Loading a backup restarts it. */}
      <div hidden={inSettings} key={restores}>
        {children}
      </div>
    </>
  );
}

function PersonaliseForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Personalisation;
  submitLabel: string;
  onSubmit: (personalisation: Personalisation) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [theme, setTheme] = useState<ThemeId>(initial.theme);

  return (
    <form
      class="personalise-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ name: name.trim() || FALLBACK_NAME, theme });
      }}
    >
      <label class="name-field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          placeholder={FALLBACK_NAME}
          maxLength={MAX_NAME_LENGTH}
          autocomplete="off"
          onInput={(event) => setName(event.currentTarget.value)}
        />
      </label>
      <fieldset class="theme-picker">
        <legend>Colours</legend>
        {THEMES.map((t) => (
          <label key={t.id} class="theme-option">
            <input type="radio" name="theme" value={t.id} checked={theme === t.id} onChange={() => setTheme(t.id)} />
            <span class="swatch" data-theme={t.id} aria-hidden="true">
              <span class="swatch-accent" />
            </span>
            <span>
              <span lang="nl">{t.label}</span> <span class="theme-english">({t.english})</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div class="form-actions">
        <button type="submit" class="primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/** Applies the theme to the whole page and uses the chosen name as the page title. */
function applyPersonalisation({ name, theme }: Personalisation) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  document.title = name;
  // Tint Safari's bars to match; jsdom (tests) has no computed custom properties, hence the guard.
  const background = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (background) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
}
