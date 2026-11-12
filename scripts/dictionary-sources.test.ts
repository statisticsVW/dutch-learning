import { describe, expect, it } from 'vitest';
import { readNt2Lex } from './nt2lex.ts';
import { dutchSenses } from './wiktionary-senses.ts';
import { buildDictionaryEntries, shortMeanings } from './dictionary-entries.ts';
import type { DictionaryEntry } from '../src/content/types.ts';

const COLUMNS = ['word', 'tag', 'F@A1', 'U@A1', 'F@A2', 'U@A2', 'F@B1', 'U@B1', 'U@TOTAL'];
const tsv = (rows: string[][]) => [COLUMNS, ...rows].map((r) => r.join('\t')).join('\r\n') + '\r\n';

describe('readNt2Lex', () => {
  it('keeps single A1 and A2 words, maps their tags to parts of speech, most frequent first', () => {
    const text = tsv([
      ['huis', 'N(soort)', '5', '90', '9', '80', '3', '10', '60'],
      ['lopen', 'WW()', '-', '-', '4', '40', '2', '20', '30'],
      ['hoogleraar', 'N(soort)', '-', '-', '-', '-', '2', '5', '1'], // B1 only
      ['Amsterdam', 'N(eigen)', '3', '9', '-', '-', '-', '-', '9'], // a name
      ["'s avonds", 'BW()', '1', '1', '-', '-', '-', '-', '1'], // more than one word
      ['ik', 'VNW(pers,pron)', '9', '200', '9', '200', '9', '200', '200'],
      ['de', 'LID(bep)', '9', '900', '9', '900', '9', '900', '900'], // articles are not entries
    ]);
    expect(readNt2Lex(text)).toEqual([
      { word: 'ik', pos: 'pronoun', level: 'A1', frequency: 200 },
      { word: 'huis', pos: 'noun', level: 'A1', frequency: 60 },
      { word: 'lopen', pos: 'verb', level: 'A2', frequency: 30 },
    ]);
  });

  it('merges tags that are the same part of speech for us', () => {
    const text = tsv([
      ['door', 'VZ(init)', '1', '10', '-', '-', '-', '-', '10'],
      ['door', 'VZ(fin)', '-', '-', '1', '5', '-', '-', '5'],
    ]);
    expect(readNt2Lex(text)).toEqual([{ word: 'door', pos: 'preposition', level: 'A1', frequency: 15 }]);
  });
});

// Trimmed from real English Wiktionary pages (CC BY-SA 4.0, Wiktionary contributors).
const page = `==English==
===Noun===
# not Dutch

==Dutch==
===Etymology 1===
====Noun====
{{nl-noun|n|-en|-je}}
# [[house]], [[home]]
#: {{ux|nl|Het huis is groot.}}
# {{lb|nl|obsolete}} an old sense
# {{lb|nl|vulgar}} a rude sense
# {{plural of|nl|huizen}}
====Verb====
{{nl-verb}}
# {{lb|nl|transitive}} to [[house]], to [[shelter]]
=====Conjugation=====
# not a sense
===Pronoun===
{{head|nl|pronoun}}
# [[I]]; {{ng|first-person singular subjective personal pronoun}}

==German==
===Noun===
# not Dutch either
`;

describe('dutchSenses', () => {
  it('lists the current Dutch senses per part of speech, with a noun sense’s articles', () => {
    expect(dutchSenses(page)).toEqual({
      noun: [{ articles: ['het'], text: 'house, home' }],
      verb: [{ articles: [], text: 'to house, to shelter' }],
      pronoun: [{ articles: [], text: 'I; (first-person singular subjective personal pronoun)' }],
    });
  });

  it('gives nothing for a page without a Dutch section', () => {
    expect(dutchSenses('==English==\n===Noun===\n# thing\n')).toEqual({});
  });

  it('drops a part of speech whose main sense is unsuitable for a young Learner', () => {
    const rude = `==Dutch==\n===Noun===\n{{nl-noun|m}}\n# {{lb|nl|vulgar}} rude\n# fine\n`;
    expect(dutchSenses(rude)).toEqual({});
  });
});

describe('shortMeanings', () => {
  it('turns Wiktionary senses into up to three short English meanings', () => {
    expect(shortMeanings(['house, home (place to live)', 'building; something long to explain', 'house', 'family', 'line'], 'noun')).toEqual([
      'house',
      'home',
      'building',
    ]);
  });

  it('keeps "to" on every meaning of a verb', () => {
    expect(shortMeanings(['to put, set', 'to place'], 'verb')).toEqual(['to put', 'to set', 'to place']);
  });

  it('skips meanings that are too long or not plain words', () => {
    expect(shortMeanings(['a very long explanation of something that is not a translation at all', '“quoted”', 'cat'], 'noun')).toEqual(['cat']);
  });

  it('takes only the start of a sense that explains rather than translates, and drops "a" in front of a noun', () => {
    expect(
      shortMeanings(
        [
          'a central office in any business or institution, responsible for correspondence, making appointments',
          'a young: a young being, especially an immature animal',
          'murder, a type of killing legally in a more severe degree than homicide',
        ],
        'noun',
      ),
    ).toEqual(['young', 'murder']);
    expect(shortMeanings(['A maiden, damsel, or young unmarried noblewoman.'], 'noun')).toEqual(['maiden', 'damsel']);
  });

  it('skips pieces of an explanation that a comma split off', () => {
    expect(shortMeanings(['to ring, like using a bell'], 'verb')).toEqual(['to ring']);
    expect(shortMeanings(['physical warmth, thermal energy, from moderate to heat'], 'noun')).toEqual(['physical warmth', 'thermal energy']);
    expect(shortMeanings(['a monster, terrifying and dangerous creature'], 'noun')).toEqual(['monster']);
    expect(shortMeanings(['destructive, catastrophic fire'], 'noun')).toEqual(['catastrophic fire']);
  });

  it('does not put "to" in front of may, can or must', () => {
    expect(shortMeanings(['may, can, be allowed to'], 'verb')).toEqual(['may', 'can', 'to be allowed to']);
  });

  it('takes every meaning of the first sense, but only a short first meaning of later ones', () => {
    expect(shortMeanings(['beer', 'serving of a drink, glass', 'to say all one wishes to say'], 'noun')).toEqual(['beer']);
    expect(shortMeanings(['football club'], 'noun')).toEqual(['football club']);
  });
});

describe('buildDictionaryEntries', () => {
  const snapshot = { huis: ['het'], kat: ['de'], appel: { de: ['apple (fruit)'], het: ['appeal'] } } as const;
  const existing: DictionaryEntry[] = [{ id: 'dict-kat', dutch: 'kat', english: ['cat'], pos: 'noun', article: 'de' }];

  it('keeps existing entries, then adds the most frequent words with meanings until the target', () => {
    const entries = buildDictionaryEntries({
      candidates: [
        { word: 'kat', pos: 'noun', level: 'A1', frequency: 99 },
        { word: 'huis', pos: 'noun', level: 'A1', frequency: 90 },
        { word: 'onbekend', pos: 'noun', level: 'A1', frequency: 80 }, // no Wiktionary senses
        { word: 'lopen', pos: 'verb', level: 'A1', frequency: 70 },
        { word: 'rennen', pos: 'verb', level: 'A1', frequency: 60 }, // over the target
      ],
      senses: {
        huis: { noun: [{ articles: ['het'], text: 'house' }] },
        lopen: { verb: [{ articles: [], text: 'to walk' }] },
        rennen: { verb: [{ articles: [], text: 'to run' }] },
      },
      snapshot,
      existing,
      target: 3,
    });
    expect(entries).toEqual([
      { id: 'dict-kat', dutch: 'kat', english: ['cat'], pos: 'noun', article: 'de' },
      { id: 'dict-huis', dutch: 'huis', english: ['house'], pos: 'noun', article: 'het' },
      { id: 'dict-lopen', dutch: 'lopen', english: ['to walk'], pos: 'verb' },
    ]);
  });

  it('takes the article of the noun the first sense belongs to, and skips nouns the snapshot does not know', () => {
    const entries = buildDictionaryEntries({
      candidates: [
        { word: 'appel', pos: 'noun', level: 'A1', frequency: 9 },
        { word: 'raar', pos: 'noun', level: 'A1', frequency: 8 },
      ],
      senses: {
        appel: { noun: [{ articles: ['de'], text: 'apple' }, { articles: ['het'], text: 'appeal' }] },
        raar: { noun: [{ articles: ['de'], text: 'weirdo' }] },
      },
      snapshot,
      existing: [],
      target: 10,
    });
    expect(entries).toEqual([{ id: 'dict-appel', dutch: 'appel', english: ['apple'], pos: 'noun', article: 'de' }]);
  });

  it('adds an adjective’s adverb meanings, since Dutch uses most adjectives as adverbs too', () => {
    const entries = buildDictionaryEntries({
      candidates: [{ word: 'eigenlijk', pos: 'adjective', level: 'A1', frequency: 9 }],
      senses: { eigenlijk: { adjective: [{ articles: [], text: 'actual' }], adverb: [{ articles: [], text: 'actually, really' }] } },
      snapshot: {},
      existing: [],
      target: 10,
    });
    expect(entries).toEqual([{ id: 'dict-eigenlijk', dutch: 'eigenlijk', english: ['actual', 'actually'], pos: 'adjective' }]);
  });

  it('gives a second part of speech of the same word its own id', () => {
    const entries = buildDictionaryEntries({
      candidates: [
        { word: 'eten', pos: 'verb', level: 'A1', frequency: 9 },
        { word: 'eten', pos: 'noun', level: 'A1', frequency: 8 },
      ],
      senses: { eten: { verb: [{ articles: [], text: 'to eat' }], noun: [{ articles: ['het'], text: 'food' }] } },
      snapshot: { eten: ['het'] },
      existing: [],
      target: 10,
    });
    expect(entries.map((e) => e.id)).toEqual(['dict-eten', 'dict-eten-noun']);
  });
});
