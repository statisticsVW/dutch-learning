import { useState } from 'preact/hooks';
import type { Clock } from '../adapters/clock';
import type { ProgressStore } from '../adapters/progress-store';
import type { MyWordsStore } from '../adapters/my-words-store';
import type { PersonalisationStore } from '../adapters/personalisation-store';
import { backupFileName, createBackup, parseBackup, restoreBackup, type Backup } from './backup';
import type { BackupFiles } from './files';

/** What Settings needs for backups, besides the personalisation store it already has. */
export type BackupDeps = { progress: ProgressStore; myWords: MyWordsStore; files: BackupFiles; clock: Clock };

type Props = BackupDeps & { personalisation: PersonalisationStore; onRestored: (backup: Backup) => void };

type State =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'problem'; message: string }
  | { kind: 'confirm'; backup: Backup; exportedAt: Date };

/** Settings section: save a backup file, or load one to restore progress (e.g. on a new phone). */
export function BackupSection({ progress, myWords, personalisation, files, clock, onRestored }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const save = () => {
    const chosen = personalisation.load();
    if (!chosen) return; // Settings only exists once the Learner has chosen a name.
    const now = clock.now();
    const text = createBackup({ progress: progress.load(), personalisation: chosen, myWords: myWords.load() }, now);
    // No await before this call: Safari only opens the share sheet during the tap.
    setState({ kind: 'saving' });
    files.save({ name: backupFileName(now), text }).then(
      (outcome) => setState(outcome === 'saved' ? { kind: 'saved' } : { kind: 'idle' }),
      () => setState({ kind: 'problem', message: "The backup couldn't be saved. Please try again." }),
    );
  };

  const load = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = ''; // so picking the same file again still counts as a change
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setState({ kind: 'problem', message: "That file couldn't be opened. Your progress is unchanged." });
      return;
    }
    const parsed = parseBackup(text);
    setState(parsed.ok ? { kind: 'confirm', backup: parsed.backup, exportedAt: parsed.exportedAt } : { kind: 'problem', message: parsed.message });
  };

  const restore = (backup: Backup) => {
    try {
      restoreBackup(backup, { progress, myWords, personalisation });
    } catch {
      setState({ kind: 'problem', message: "The backup couldn't be loaded, so nothing was changed. Please try again." });
      return;
    }
    setState({ kind: 'idle' });
    onRestored(backup);
  };

  return (
    <section class="backup" aria-labelledby="backup-heading">
      <h3 id="backup-heading">Backup</h3>
      <p>Save a backup now and then, and keep it somewhere safe like Files or iCloud Drive. On a new phone, load it to get your progress back.</p>

      {state.kind === 'confirm' ? (
        <div class="backup-confirm">
          <p>
            This backup is from {formatDate(state.exportedAt)}. In it you know {wordsKnown(state.backup)}. Loading it replaces your progress on this
            phone.
          </p>
          <div class="form-actions">
            <button type="button" class="primary" onClick={() => restore(state.backup)}>
              Replace my progress
            </button>
            <button type="button" onClick={() => setState({ kind: 'idle' })}>
              Keep my progress
            </button>
          </div>
        </div>
      ) : (
        <div class="form-actions">
          {/* Disabled while the share sheet is open: Safari refuses a second share meanwhile. */}
          <button type="button" onClick={save} disabled={state.kind === 'saving'}>
            Save a backup
          </button>
          <label class="file-button">
            Load a backup
            <input type="file" onChange={(event) => load(event.currentTarget)} />
          </label>
        </div>
      )}

      {state.kind === 'saved' && <p role="status">Backup saved.</p>}
      {state.kind === 'problem' && (
        <p role="alert" class="backup-problem">
          {state.message}
        </p>
      )}
    </section>
  );
}

function wordsKnown({ progress }: Backup): string {
  const count = Object.values(progress.cards).filter((c) => c.lastCorrect).length;
  return `${count} Dutch ${count === 1 ? 'word' : 'words'}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
