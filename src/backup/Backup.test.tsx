import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { App } from '../App';
import { PersonaliseGate } from '../personalise/PersonaliseGate';
import { createBackup, parseBackup } from './backup';
import { createMemoryBackupFiles } from './files';
import { createFakeClock } from '../adapters/clock';
import { createMemoryProgressStore } from '../adapters/progress-store';
import { createMemoryPersonalisationStore } from '../adapters/personalisation-store';
import { createMemoryMyWordsStore } from '../adapters/my-words-store';
import { emptyProgress, type Progress } from '../engine/engine';
import type { DictionaryEntry, Pack } from '../content/types';

const animals: Pack = {
  id: 'animals',
  title: 'Animals',
  cards: [
    { id: 'animals-dog', dutch: 'hond', english: ['dog'], pos: 'noun', article: 'de' },
    { id: 'animals-cat', dutch: 'kat', english: ['cat'], pos: 'noun', article: 'de' },
  ],
};
const word: DictionaryEntry = { id: 'dict-vis', dutch: 'vis', english: ['fish'], pos: 'noun', article: 'de' };
const now = new Date('2026-11-12T10:00:00Z');

/** Progress in which the Learner knows the given Cards. */
function knowing(...ids: string[]): Progress {
  const memory = { stability: 3, difficulty: 5, scheduledDays: 3, learningSteps: 0, reps: 1, lapses: 0, state: 2, lastReview: now.toISOString() };
  return { version: 1, cards: Object.fromEntries(ids.map((id) => [id, { due: '2026-11-15T10:00:00.000Z', lastCorrect: true, memory }])) };
}

function setup(progress: Progress = knowing('animals-dog')) {
  const stores = {
    progress: createMemoryProgressStore(progress),
    personalisation: createMemoryPersonalisationStore({ name: 'Testapp', theme: 'groen' }),
    myWords: createMemoryMyWordsStore(),
  };
  const files = createMemoryBackupFiles();
  const clock = createFakeClock(now);
  render(
    <PersonaliseGate store={stores.personalisation} backup={{ progress: stores.progress, myWords: stores.myWords, files, clock }}>
      <App packs={[animals]} store={stores.progress} clock={clock} dictionary={{ load: async () => [word], myWords: stores.myWords }} />
    </PersonaliseGate>,
  );
  return { stores, files };
}

const openSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
const appName = () => within(screen.getByRole('banner')).getByRole('heading', { level: 1 }).textContent;

function chooseFile(text: string, name = 'dutch-backup.json') {
  const input = screen.getByLabelText(/load a backup/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File([text], name, { type: 'application/json' })] } });
}

describe('backing up from Settings', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    document.title = '';
  });

  it('saves a backup file of progress, name, theme and Mijn woorden', async () => {
    const { stores, files } = setup();
    stores.myWords.save([word]);
    openSettings();

    fireEvent.click(screen.getByRole('button', { name: /save a backup/i }));

    await screen.findByText(/backup saved/i);
    expect(files.saved).toHaveLength(1);
    expect(files.saved[0]!.name).toBe('dutch-backup-2026-11-12.json');
    expect(parseBackup(files.saved[0]!.text)).toEqual({
      ok: true,
      exportedAt: now,
      backup: { progress: knowing('animals-dog'), personalisation: { name: 'Testapp', theme: 'groen' }, myWords: [word] },
    });
  });

  it('says nothing went wrong when the Learner closes the share sheet', async () => {
    const { files } = setup();
    files.next = 'cancelled';
    openSettings();

    fireEvent.click(screen.getByRole('button', { name: /save a backup/i }));

    await waitFor(() => expect(files.saved).toHaveLength(1));
    expect(screen.queryByText(/backup saved/i)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says so when the backup could not be saved', async () => {
    const { files } = setup();
    files.next = new Error('share failed');
    openSettings();

    fireEvent.click(screen.getByRole('button', { name: /save a backup/i }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/couldn't be saved/i);
    expect(screen.getByRole('button', { name: /save a backup/i })).toHaveProperty('disabled', false);
  });

  it('importing a bad file shows a clear message and leaves progress unchanged', async () => {
    const { stores } = setup();
    openSettings();

    chooseFile('{"this is": "not a backup"');

    expect((await screen.findByRole('alert')).textContent).toMatch(/isn't a backup.*progress is unchanged/i);
    expect(screen.queryByRole('button', { name: /replace my progress/i })).toBeNull();
    expect(stores.progress.saved).toHaveLength(0);
    expect(stores.progress.load()).toEqual(knowing('animals-dog'));
    expect(stores.personalisation.load()).toEqual({ name: 'Testapp', theme: 'groen' });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('You know 1 Dutch word')).toBeTruthy();
  });

  it('importing a damaged backup shows a message and leaves progress unchanged', async () => {
    const { stores } = setup();
    openSettings();
    const damaged = createBackup({ progress: knowing('animals-dog', 'animals-cat'), personalisation: { name: 'Other', theme: 'nacht' }, myWords: [] }, now).replace('"lastCorrect": true', '"lastCorrect": "yes"');

    chooseFile(damaged);

    expect((await screen.findByRole('alert')).textContent).toMatch(/damaged/i);
    expect(stores.progress.saved).toHaveLength(0);
    expect(stores.progress.load()).toEqual(knowing('animals-dog'));
  });

  it('asks before replacing progress, and changes nothing if the Learner says no', async () => {
    const { stores } = setup();
    openSettings();

    chooseFile(createBackup({ progress: knowing('animals-dog', 'animals-cat'), personalisation: { name: 'Other', theme: 'nacht' }, myWords: [] }, now));

    expect((await screen.findByText(/12 november 2026/i)).textContent).toMatch(/you know 2 dutch words/i);
    fireEvent.click(screen.getByRole('button', { name: /keep my progress/i }));

    expect(screen.queryByRole('button', { name: /replace my progress/i })).toBeNull();
    expect(stores.progress.saved).toHaveLength(0);
  });

  it('restores a good backup on a new phone: progress, name, theme and Mijn woorden', async () => {
    const { stores } = setup(emptyProgress());
    expect(screen.getByText('You know 0 Dutch words')).toBeTruthy();
    openSettings();

    chooseFile(createBackup({ progress: knowing('animals-dog', 'animals-cat'), personalisation: { name: 'Other', theme: 'nacht' }, myWords: [word] }, now));
    fireEvent.click(await screen.findByRole('button', { name: /replace my progress/i }));

    expect(screen.getByText(/backup loaded/i)).toBeTruthy();
    expect(screen.getByText('You know 2 Dutch words')).toBeTruthy();
    expect(appName()).toBe('Other');
    expect(document.documentElement.dataset.theme).toBe('nacht');
    expect(stores.progress.load()).toEqual(knowing('animals-dog', 'animals-cat'));
    expect(stores.myWords.load()).toEqual([word]);
  });
});
