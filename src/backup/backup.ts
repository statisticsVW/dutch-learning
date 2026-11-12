// The backup file: the Learner's whole on-device state in one versioned JSON file (ADR 0001).
// Pure: no DOM, storage or files. Saving the file and reading one back are the UI's job.
import type { CardProgress, Progress } from '../engine/engine';
import type { Personalisation, PersonalisationStore } from '../adapters/personalisation-store';
import type { ProgressStore } from '../adapters/progress-store';
import type { MyWordsStore } from '../adapters/my-words-store';
import { ARTICLES, PARTS_OF_SPEECH, type DictionaryEntry } from '../content/types';
import { DEFAULT_THEME, isThemeId } from '../personalise/themes';

/** Everything the Learner would lose with his phone: progress, the app's name and colours, and Mijn woorden. */
export type Backup = { progress: Progress; personalisation: Personalisation; myWords: DictionaryEntry[] };

export type ParsedBackup = { ok: true; backup: Backup; exportedAt: Date } | { ok: false; message: string };

export type BackupStores = { progress: ProgressStore; personalisation: PersonalisationStore; myWords: MyWordsStore };

/** Marks the file as ours, so a random JSON file is "not a backup" rather than "damaged". */
const APP = 'dutch-learning';
const VERSION = 1;

const NOT_A_BACKUP = "That file isn't a backup from this app. Your progress is unchanged.";
const DAMAGED = 'That backup is damaged, so it was not loaded. Your progress is unchanged.';
const TOO_NEW = 'That backup was made by a newer version of the app. Open the app with an internet connection to update it, then try again. Your progress is unchanged.';

export function createBackup(backup: Backup, exportedAt: Date): string {
  return JSON.stringify({ app: APP, version: VERSION, exportedAt: exportedAt.toISOString(), ...backup }, null, 2);
}

export function backupFileName(exportedAt: Date): string {
  return `dutch-backup-${exportedAt.toISOString().slice(0, 10)}.json`;
}

/** Reads a backup file's text. Never throws: anything unusable becomes a message for the Learner. */
export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: NOT_A_BACKUP };
  }
  if (!isRecord(data) || data.app !== APP || !('version' in data)) return { ok: false, message: NOT_A_BACKUP };
  if (isNewerVersion(data.version) || (isRecord(data.progress) && isNewerVersion(data.progress.version))) return { ok: false, message: TOO_NEW };
  if (data.version !== VERSION || !isDate(data.exportedAt)) return { ok: false, message: DAMAGED };

  const { progress, personalisation, myWords } = data;
  if (!isProgress(progress) || !isRecord(personalisation) || !Array.isArray(myWords) || !myWords.every(isDictionaryEntry)) return { ok: false, message: DAMAGED };
  if (typeof personalisation.name !== 'string' || personalisation.name.trim() === '') return { ok: false, message: DAMAGED };

  return {
    ok: true,
    exportedAt: new Date(data.exportedAt),
    backup: {
      progress,
      // A theme that has since been removed falls back to the default, as it does in the personalisation store.
      personalisation: { name: personalisation.name, theme: isThemeId(personalisation.theme) ? personalisation.theme : DEFAULT_THEME },
      myWords,
    },
  };
}

/**
 * Replaces what is on the device with the backup. If any save fails (storage full, say),
 * puts back what was there and rethrows, so the Learner never ends up with half a restore.
 */
export function restoreBackup(backup: Backup, stores: BackupStores): void {
  const before = { progress: stores.progress.load(), personalisation: stores.personalisation.load(), myWords: stores.myWords.load() };
  try {
    stores.myWords.save(backup.myWords);
    stores.personalisation.save(backup.personalisation);
    stores.progress.save(backup.progress);
  } catch (error) {
    stores.myWords.save(before.myWords);
    if (before.personalisation) stores.personalisation.save(before.personalisation);
    stores.progress.save(before.progress);
    throw error;
  }
}

function isNewerVersion(version: unknown): boolean {
  return typeof version === 'number' && version > VERSION;
}

function isProgress(value: unknown): value is Progress {
  return isRecord(value) && value.version === 1 && isRecord(value.cards) && Object.values(value.cards).every(isCardProgress);
}

const MEMORY_NUMBERS = ['stability', 'difficulty', 'scheduledDays', 'learningSteps', 'reps', 'lapses', 'state'] as const;

function isCardProgress(value: unknown): value is CardProgress {
  if (!isRecord(value) || !isDate(value.due) || typeof value.lastCorrect !== 'boolean') return false;
  const memory = value.memory;
  return (
    isRecord(memory) &&
    MEMORY_NUMBERS.every((key) => typeof memory[key] === 'number' && Number.isFinite(memory[key])) &&
    (memory.lastReview === undefined || isDate(memory.lastReview))
  );
}

function isDictionaryEntry(value: unknown): value is DictionaryEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.dutch === 'string' &&
    Array.isArray(value.english) &&
    value.english.every((e) => typeof e === 'string') &&
    (PARTS_OF_SPEECH as readonly unknown[]).includes(value.pos) &&
    (value.article === undefined || (ARTICLES as readonly unknown[]).includes(value.article))
  );
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
