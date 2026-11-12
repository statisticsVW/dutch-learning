import { beforeEach, describe, expect, it } from 'vitest';
import type { DictionaryEntry } from '../content/types';
import { createLocalMyWordsStore, MY_WORDS_KEY } from './my-words-store';

const boek: DictionaryEntry = { id: 'dict-boek', dutch: 'boek', english: ['book'], pos: 'noun', article: 'het' };

describe('the on-device Mijn woorden store', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty on a fresh device', () => {
    expect(createLocalMyWordsStore(localStorage).load()).toEqual([]);
  });

  it('gives back what it saved, across store instances (a reload)', () => {
    createLocalMyWordsStore(localStorage).save([boek]);

    expect(createLocalMyWordsStore(localStorage).load()).toEqual([boek]);
  });

  it('keeps its own key, apart from the Learner progress', () => {
    createLocalMyWordsStore(localStorage).save([boek]);

    expect(Object.keys(localStorage)).toEqual([MY_WORDS_KEY]);
  });

  it('starts empty but keeps unreadable saved data aside rather than overwriting it', () => {
    localStorage.setItem(MY_WORDS_KEY, JSON.stringify({ version: 99, words: [] }));

    const store = createLocalMyWordsStore(localStorage);
    expect(store.load()).toEqual([]);
    store.save([boek]);

    expect(localStorage.getItem(`${MY_WORDS_KEY}.unreadable`)).toContain('"version":99');
  });
});
