// Mijn woorden through the learning engine: added words become a Pack the engine
// offers, schedules and counts exactly like any other.
import { describe, expect, it } from 'vitest';
import type { DictionaryEntry, Pack } from '../content/types';
import { createEngine, emptyProgress, type Engine, type Progress } from '../engine/engine';
import { createFakeClock } from '../adapters/clock';
import { addWord, MY_WORDS_PACK_ID, refreshWords, removeWord, withMyWords } from './my-words';

const DAY = 24 * 60 * 60 * 1000;
const START = new Date('2026-01-01T10:00:00Z');

const hello: Pack = {
  id: 'hello',
  title: 'Hello',
  cards: [
    { id: 'hello-01', dutch: 'hallo', english: ['hello'], pos: 'interjection' },
    { id: 'hello-02', dutch: 'naam', english: ['name'], pos: 'noun', article: 'de' },
    { id: 'hello-03', dutch: 'ja', english: ['yes'], pos: 'interjection' },
  ],
};
const boek: DictionaryEntry = { id: 'dict-boek', dutch: 'boek', english: ['book'], pos: 'noun', article: 'het' };
const lezen: DictionaryEntry = { id: 'dict-lezen', dutch: 'lezen', english: ['to read'], pos: 'verb' };

function engineWith(words: DictionaryEntry[], progress: Progress = emptyProgress()): Engine {
  return createEngine({ packs: withMyWords([hello], words), progress, clock: createFakeClock(START), random: () => 0.5 });
}

/** Answers the next prompt correctly; returns the Card id and the Dutch shown. */
function answerCorrectly(engine: Engine, words: DictionaryEntry[]) {
  const prompt = engine.nextPrompt();
  if (prompt.kind !== 'prompt') throw new Error('expected a prompt');
  const card = [...hello.cards, ...words].find((c) => c.id === prompt.cardId)!;
  return { cardId: prompt.cardId, dutch: prompt.dutch, result: engine.answer(card.english[0]) };
}

describe('Mijn woorden', () => {
  it('adds a Dictionary entry once, keeping the order the Learner added them in', () => {
    const words = addWord(addWord(addWord([], boek), lezen), boek);

    expect(words.map((w) => w.id)).toEqual(['dict-boek', 'dict-lezen']);
  });

  it('removes a word', () => {
    expect(removeWord([boek, lezen], 'dict-boek')).toEqual([lezen]);
    expect(removeWord([lezen], 'dict-boek')).toEqual([lezen]);
  });

  it('is not offered as a Pack until it has a word', () => {
    expect(engineWith([]).overview().packs.map((p) => p.id)).toEqual(['hello']);
  });

  it('offers added words as a Pack, practised with their article like any Card', () => {
    const words = addWord(addWord([], boek), lezen);
    const engine = engineWith(words);

    expect(engine.overview().packs).toContainEqual({ id: MY_WORDS_PACK_ID, title: 'Mijn woorden', learned: 0, total: 2 });
    engine.startNewCards(MY_WORDS_PACK_ID);
    const first = answerCorrectly(engine, words);
    const second = answerCorrectly(engine, words);

    expect([first.dutch, second.dutch]).toEqual(['het boek', 'lezen']);
    expect(engine.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: false });
  });

  it('schedules and counts added words like Pack Cards', () => {
    const words = [boek];
    const engine = engineWith(words);
    engine.startNewCards(MY_WORDS_PACK_ID);
    const { result } = answerCorrectly(engine, words);

    expect(result.verdict).toBe('correct');
    expect(new Date(result.progress.cards['dict-boek'].due).getTime()).toBeGreaterThanOrEqual(START.getTime() + DAY);
    expect(engine.overview().wordsKnown).toBe(1);
    expect(engine.overview().packs).toContainEqual({ id: MY_WORDS_PACK_ID, title: 'Mijn woorden', learned: 1, total: 1 });
  });

  it('keeps the progress on a word that is removed and added again', () => {
    const engine = engineWith([boek]);
    engine.startNewCards(MY_WORDS_PACK_ID);
    const { result } = answerCorrectly(engine, [boek]);

    const removed = engineWith(removeWord([boek], boek.id), result.progress);
    expect(removed.overview().wordsKnown).toBe(0);

    const readded = engineWith(addWord([], boek), removed.progress());
    expect(readded.overview().wordsKnown).toBe(1);
    expect(readded.progress().cards['dict-boek']).toEqual(result.progress.cards['dict-boek']);
  });

  it('takes the Curator corrections from the Dictionary, keeping words the Dictionary no longer has', () => {
    const corrected = { ...boek, english: ['book', 'volume'] };
    const words = [boek, lezen];

    expect(refreshWords(words, [corrected])).toEqual([corrected, lezen]);
    expect(refreshWords(words, [boek, lezen])).toBe(words);
  });
});
