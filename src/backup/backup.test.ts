import { describe, expect, it } from 'vitest';
import { backupFileName, createBackup, parseBackup, restoreBackup, type Backup } from './backup';
import { createEngine, emptyProgress, type Progress } from '../engine/engine';
import { createFakeClock } from '../adapters/clock';
import { createMemoryProgressStore, type ProgressStore } from '../adapters/progress-store';
import { createMemoryPersonalisationStore } from '../adapters/personalisation-store';
import { createMemoryMyWordsStore } from '../adapters/my-words-store';
import type { DictionaryEntry, Pack } from '../content/types';

const pack: Pack = {
  id: 'food',
  title: 'Food',
  cards: [
    { id: 'food-apple', dutch: 'de appel', english: ['apple'], pos: 'noun', article: 'de' },
    { id: 'food-bread', dutch: 'het brood', english: ['bread'], pos: 'noun', article: 'het' },
    { id: 'food-eat', dutch: 'eten', english: ['to eat'], pos: 'verb' },
    { id: 'food-water', dutch: 'het water', english: ['water'], pos: 'noun', article: 'het' },
    { id: 'food-milk', dutch: 'de melk', english: ['milk'], pos: 'noun', article: 'de' },
  ],
};
const word: DictionaryEntry = { id: 'dict-hond', dutch: 'de hond', english: ['dog'], pos: 'noun', article: 'de' };
const exportedAt = new Date('2026-11-12T10:00:00Z');

/** Real progress, made by practising with the engine, so the fixture can't drift from what the engine saves. */
function practisedProgress(): Progress {
  const engine = createEngine({ packs: [pack], progress: emptyProgress(), clock: createFakeClock(exportedAt), random: () => 0.3 });
  engine.startNewCards('food');
  let answered = 0;
  for (let next = engine.nextPrompt(); next.kind === 'prompt'; next = engine.nextPrompt()) {
    // Alternate right and wrong answers, so both kinds of Card progress are in the backup.
    const right = pack.cards.find((c) => c.id === next.cardId)!.english[0]!;
    engine.answer(answered++ % 2 === 0 ? right : next.options.find((o) => o !== right)!);
  }
  return engine.progress();
}

function sample(): Backup {
  return { progress: practisedProgress(), personalisation: { name: 'Testapp', theme: 'blauw' }, myWords: [word] };
}

function rejected(text: string): string {
  const result = parseBackup(text);
  if (result.ok) throw new Error('expected the backup to be rejected');
  return result.message;
}

function withChange(change: (data: any) => void): string {
  const data = JSON.parse(createBackup(sample(), exportedAt));
  change(data);
  return JSON.stringify(data);
}

describe('export and import', () => {
  it('round-trips progress, name, theme and Mijn woorden exactly', () => {
    const backup = sample();
    expect(Object.keys(backup.progress.cards).length).toBe(5);

    const result = parseBackup(createBackup(backup, exportedAt));

    expect(result).toEqual({ ok: true, backup, exportedAt });
  });

  it('round-trips empty progress', () => {
    const backup: Backup = { progress: emptyProgress(), personalisation: { name: 'Testapp', theme: 'oranje' }, myWords: [] };

    expect(parseBackup(createBackup(backup, exportedAt))).toEqual({ ok: true, backup, exportedAt });
  });

  it('restored progress carries on in the engine just as the original would', () => {
    const backup = sample();
    const later = createFakeClock(new Date('2026-11-20T10:00:00Z'));
    const result = parseBackup(createBackup(backup, exportedAt));
    if (!result.ok) throw new Error(result.message);

    const original = createEngine({ packs: [pack], progress: backup.progress, clock: later }).overview();
    const restored = createEngine({ packs: [pack], progress: result.backup.progress, clock: later }).overview();

    expect(restored).toEqual(original);
  });

  it('names the file after the day it was made', () => {
    expect(backupFileName(exportedAt)).toBe('dutch-backup-2026-11-12.json');
  });
});

describe('rejecting a bad import', () => {
  it('rejects a file that is not JSON', () => {
    expect(rejected('this is not a backup')).toMatch(/isn't a backup/i);
    expect(rejected(createBackup(sample(), exportedAt).slice(0, 200))).toMatch(/isn't a backup/i);
    expect(rejected('')).toMatch(/isn't a backup/i);
  });

  it('rejects JSON that is not a backup from this app', () => {
    expect(rejected('[]')).toMatch(/isn't a backup/i);
    expect(rejected('null')).toMatch(/isn't a backup/i);
    expect(rejected(JSON.stringify(emptyProgress()))).toMatch(/isn't a backup/i);
    expect(rejected(withChange((d) => (d.app = 'some-other-app')))).toMatch(/isn't a backup/i);
  });

  it('rejects a backup from a newer version with its own message', () => {
    expect(rejected(withChange((d) => (d.version = 2)))).toMatch(/newer version/i);
    expect(rejected(withChange((d) => (d.progress.version = 2)))).toMatch(/newer version/i);
  });

  it('rejects an unknown or missing version', () => {
    expect(rejected(withChange((d) => delete d.version))).toMatch(/isn't a backup/i);
    expect(rejected(withChange((d) => (d.version = '1')))).toMatch(/damaged/i);
    expect(rejected(withChange((d) => (d.version = 0)))).toMatch(/damaged/i);
    expect(rejected(withChange((d) => delete d.progress.version))).toMatch(/damaged/i);
  });

  it.each([
    ['progress is missing', (d: any) => delete d.progress],
    ['cards is a list', (d: any) => (d.progress.cards = [])],
    ['a Card has no due date', (d: any) => delete d.progress.cards['food-apple'].due],
    ['a due date is not a date', (d: any) => (d.progress.cards['food-apple'].due = 'soon')],
    ['lastCorrect is not true or false', (d: any) => (d.progress.cards['food-apple'].lastCorrect = 'yes')],
    ['scheduler memory is missing', (d: any) => delete d.progress.cards['food-apple'].memory],
    ['a scheduler number is text', (d: any) => (d.progress.cards['food-apple'].memory.stability = '3')],
    ['a scheduler number is not finite', (d: any) => (d.progress.cards['food-apple'].memory.difficulty = null)],
    ['a last review is not a date', (d: any) => (d.progress.cards['food-apple'].memory.lastReview = 'yesterday')],
    ['personalisation is missing', (d: any) => delete d.personalisation],
    ['the name is empty', (d: any) => (d.personalisation.name = '  ')],
    ['Mijn woorden is not a list', (d: any) => (d.myWords = {})],
    ['a word has no Dutch', (d: any) => delete d.myWords[0].dutch],
    ['a word has no English', (d: any) => (d.myWords[0].english = 'dog')],
    ['a word has an unknown part of speech', (d: any) => (d.myWords[0].pos = 'thing')],
    ['a noun has an article that is not de or het', (d: any) => (d.myWords[0].article = 'den')],
  ])('rejects a damaged backup: %s', (_, change) => {
    expect(rejected(withChange(change))).toMatch(/damaged/i);
  });

  it('keeps a backup whose theme has since been removed, with the default theme', () => {
    const result = parseBackup(withChange((d) => (d.personalisation.theme = 'regenboog')));

    expect(result.ok && result.backup.personalisation).toEqual({ name: 'Testapp', theme: 'oranje' });
  });
});

describe('restoring a backup', () => {
  function stores() {
    return {
      progress: createMemoryProgressStore(),
      personalisation: createMemoryPersonalisationStore({ name: 'Old name', theme: 'groen' }),
      myWords: createMemoryMyWordsStore(),
    };
  }

  it('replaces progress, name, theme and Mijn woorden', () => {
    const backup = sample();
    const s = stores();

    restoreBackup(backup, s);

    expect(s.progress.load()).toEqual(backup.progress);
    expect(s.personalisation.load()).toEqual(backup.personalisation);
    expect(s.myWords.load()).toEqual(backup.myWords);
  });

  it('puts everything back as it was if saving fails part-way', () => {
    const s = stores();
    const before = sample();
    restoreBackup(before, s);
    const failing: ProgressStore = { load: s.progress.load, save: () => { throw new Error('storage full'); } };
    const other: Backup = { progress: emptyProgress(), personalisation: { name: 'New name', theme: 'nacht' }, myWords: [] };

    expect(() => restoreBackup(other, { ...s, progress: failing })).toThrow();

    expect(s.progress.load()).toEqual(before.progress);
    expect(s.personalisation.load()).toEqual(before.personalisation);
    expect(s.myWords.load()).toEqual(before.myWords);
  });
});
