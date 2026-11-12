import { describe, expect, it } from 'vitest';
import type { DictionaryEntry } from '../content/types';
import { searchDictionary } from './search';

function entry(dutch: string, english: string | string[], extra: Partial<DictionaryEntry> = {}): DictionaryEntry {
  return { id: `dict-${dutch}`, dutch, english: [english].flat(), pos: 'noun', article: 'de', ...extra };
}

const dictionary: DictionaryEntry[] = [
  entry('kookboek', 'cookbook', { article: 'het' }),
  entry('boekenkast', 'bookcase'),
  entry('boek', 'book', { article: 'het' }),
  entry('hond', 'dog'),
  entry('café', 'café', { article: 'het' }),
  entry('reünie', 'reunion'),
  entry('één', 'one', { pos: 'numeral', article: undefined }),
  entry('eten', 'to eat', { pos: 'verb', article: undefined }),
  entry('dank je', ['thank you', 'thanks'], { pos: 'phrase', article: undefined }),
];

const dutchOf = (query: string) => searchDictionary(dictionary, query).map((e) => e.dutch);

describe('searchDictionary', () => {
  it('finds a word by its Dutch or its English', () => {
    expect(dutchOf('hond')).toEqual(['hond']);
    expect(dutchOf('dog')).toEqual(['hond']);
  });

  it('ignores capitals, accents and spaces around the query', () => {
    expect(dutchOf('  CAFE ')).toEqual(['café']);
    expect(dutchOf('reunie')).toEqual(['reünie']);
    expect(dutchOf('een')).toEqual(['één']);
  });

  it('understands queries written with an article or "to"', () => {
    expect(dutchOf('het boek')[0]).toBe('boek');
    expect(dutchOf('de hond')).toEqual(['hond']);
    expect(dutchOf('to eat')).toEqual(['eten']);
    expect(dutchOf('eat')).toEqual(['eten']);
    expect(dutchOf('a dog')).toEqual(['hond']);
  });

  it('ranks exact matches first, then words starting with the query, then words containing it', () => {
    expect(dutchOf('boek')).toEqual(['boek', 'boekenkast', 'kookboek']);
    expect(dutchOf('book')).toEqual(['boek', 'boekenkast', 'kookboek']);
  });

  it('matches the start of any word in a phrase', () => {
    expect(dutchOf('you')).toEqual(['dank je']);
    expect(dutchOf('je')).toEqual(['dank je']);
  });

  it('does not match a short query in the middle of a word', () => {
    expect(dutchOf('oo')).toEqual([]);
  });

  it('finds nothing for an unknown word or an empty query', () => {
    expect(dutchOf('xylofoon')).toEqual([]);
    expect(dutchOf('   ')).toEqual([]);
  });

  it('returns at most `limit` results', () => {
    expect(searchDictionary(dictionary, 'boek', 2)).toHaveLength(2);
  });
});
