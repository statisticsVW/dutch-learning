import { describe, expect, it } from 'vitest';
import { checkContent, checkDictionary, type ArticleSnapshot } from './check';
import type { Pack } from './types';

// A tiny stand-in for the committed Wiktionary snapshot.
const wiktionary: ArticleSnapshot = {
  appel: { de: ['apple (fruit or tree)'], het: ['appeal (act of imploring)', 'roll call'] },
  boek: ['het'],
  naam: ['de'],
  pad: ['de', 'het'],
  water: ['het'],
};

const checkWithTestSnapshot = (files: Parameters<typeof checkContent>[0]) => checkContent(files, wiktionary);

/** A one-file Pack whose cards are given as YAML list lines. */
function pack(name: string, ...cards: string[]) {
  return { path: `content/packs/${name}.yaml`, text: `title: ${name}\ncards:\n${cards.map((c) => `  - ${c}\n`).join('')}` };
}

const hello = {
  path: 'content/packs/hello.yaml',
  text: `
title: Hello & being polite
cards:
  - id: hello-01
    dutch: hallo
    english: hello
    pos: interjection
  - id: hello-02
    dutch: dank je
    english: [thank you, thanks]
    pos: phrase
`,
};

const food = {
  path: 'content/packs/food.yaml',
  text: `
title: Food
cards:
  - id: food-01
    dutch: appel
    english: apple
    pos: noun
    article: de
`,
};

function errorsOf(result: ReturnType<typeof checkContent>): string[] {
  if (result.ok) throw new Error('expected the check to fail');
  return result.errors;
}

describe('checkContent', () => {
  it('turns valid Pack files into Packs with their Cards', () => {
    const result = checkWithTestSnapshot([hello, food]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packs.map((p) => ({ id: p.id, title: p.title, cards: p.cards.length }))).toEqual([
      { id: 'hello', title: 'Hello & being polite', cards: 2 },
      { id: 'food', title: 'Food', cards: 1 },
    ]);
    expect(result.packs[0].cards[1]).toMatchObject({ id: 'hello-02', dutch: 'dank je', english: ['thank you', 'thanks'] });
    expect(result.packs[1].cards[0]).toMatchObject({ article: 'de' });
  });

  it('explains a YAML syntax error in plain language, naming the file', () => {
    const errors = errorsOf(checkWithTestSnapshot([{ path: 'content/packs/bad.yaml', text: 'title: [oops\ncards:' }]));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^content\/packs\/bad\.yaml: this file is not valid YAML/);
  });

  it('reports a missing title and a missing card list', () => {
    const errors = errorsOf(checkWithTestSnapshot([{ path: 'content/packs/empty.yaml', text: 'cards: []' }]));

    expect(errors).toEqual([
      'content/packs/empty.yaml: the Pack needs a "title" (text).',
      'content/packs/empty.yaml: the Pack needs a "cards" list with at least one Card.',
    ]);
  });

  it('points to the exact Card when a field is missing or the wrong kind', () => {
    const errors = errorsOf(
      checkWithTestSnapshot([
        {
          path: 'content/packs/animals.yaml',
          text: `
title: Animals
cards:
  - id: animals-01
    english: dog
    pos: noun
    article: de
  - dutch: kat
    english: cat
    pos: noun
    article: de
  - id: animals-03
    dutch: vis
    english: []
    pos: thing
    article: 3
`,
        },
      ]),
    );

    expect(errors).toEqual([
      'content/packs/animals.yaml, Card animals-01: "dutch" is missing (it should be the Dutch word or phrase).',
      'content/packs/animals.yaml, Card #2: "id" is missing (every Card needs a unique id, like animals-02).',
      'content/packs/animals.yaml, Card animals-03: "english" needs at least one meaning.',
      'content/packs/animals.yaml, Card animals-03: "pos" is "thing", but it must be one of: noun, verb, adjective, adverb, pronoun, preposition, conjunction, numeral, interjection, phrase.',
      'content/packs/animals.yaml, Card animals-03: "article" must be text.',
    ]);
  });

  it('rejects duplicate Card ids, within a Pack and across Packs', () => {
    const copy = {
      path: 'content/packs/greetings.yaml',
      text: `
title: Greetings
cards:
  - id: hello-01
    dutch: hoi
    english: hi
    pos: interjection
  - id: greet-02
    dutch: doei
    english: bye
    pos: interjection
  - id: greet-02
    dutch: dag
    english: bye
    pos: interjection
`,
    };

    const errors = errorsOf(checkWithTestSnapshot([hello, copy]));

    expect(errors).toEqual([
      'content/packs/greetings.yaml: Card id "hello-01" is used more than once (also in content/packs/hello.yaml). Every Card id must be unique.',
      'content/packs/greetings.yaml: Card id "greet-02" is used more than once (also in content/packs/greetings.yaml). Every Card id must be unique.',
    ]);
  });

  it('rejects two Pack files that would get the same Pack id', () => {
    const errors = errorsOf(checkWithTestSnapshot([food, { ...food, path: 'content/packs/food.yml', text: food.text.replace('food-01', 'food-02') }]));

    expect(errors).toEqual([
      'content/packs/food.yml: another Pack file (content/packs/food.yaml) has the same name. Rename one of them.',
    ]);
  });

  it('keeps the Pack name mijn-woorden for the Learner’s own Pack', () => {
    const errors = errorsOf(checkWithTestSnapshot([{ ...food, path: 'content/packs/mijn-woorden.yaml' }]));

    expect(errors).toEqual([`content/packs/mijn-woorden.yaml: the name "mijn-woorden" is kept for the Learner's own Pack, Mijn woorden. Rename the file.`]);
  });

  it('fails when there are no Pack files at all', () => {
    expect(errorsOf(checkWithTestSnapshot([]))).toEqual(['No Pack files were found in content/packs.']);
  });

  describe('articles', () => {
    it('requires an article on every noun', () => {
      const errors = errorsOf(checkWithTestSnapshot([pack('food', '{ id: food-01, dutch: appel, english: apple, pos: noun }')]));

      expect(errors).toEqual(['content/packs/food.yaml, Card food-01: "appel" is a noun, so it needs an "article": de or het.']);
    });

    it('only accepts de or het', () => {
      const errors = errorsOf(
        checkWithTestSnapshot([
          pack(
            'food',
            '{ id: food-01, dutch: appel, english: apple, pos: noun, article: the }',
            '{ id: food-02, dutch: water, english: water, pos: noun, article: Het }',
          ),
        ]),
      );

      expect(errors).toEqual([
        'content/packs/food.yaml, Card food-01: "article" is "the", but it must be de or het (in lower case).',
        'content/packs/food.yaml, Card food-02: "article" is "Het", but it must be de or het (in lower case).',
      ]);
    });

    it('rejects an article on a Card that is not a noun', () => {
      const errors = errorsOf(checkWithTestSnapshot([pack('hello', '{ id: hello-01, dutch: hallo, english: hello, pos: interjection, article: de }')]));

      expect(errors).toEqual([
        'content/packs/hello.yaml, Card hello-01: only nouns have an article. Remove "article", or change "pos" to noun.',
      ]);
    });

    it('flags an article that disagrees with Wiktionary, showing both values', () => {
      const errors = errorsOf(
        checkWithTestSnapshot([
          pack(
            'food',
            '{ id: food-07, dutch: appel, english: apple, pos: noun, article: het }',
            '{ id: food-08, dutch: boek, english: book, pos: noun, article: de }',
          ),
        ]),
      );

      expect(errors).toEqual([
        'content/packs/food.yaml, Card food-07: "appel" says het, but Wiktionary says de for "apple" (het appel means: appeal; roll call).',
        'content/packs/food.yaml, Card food-08: "boek" says de, but Wiktionary says het.',
      ]);
    });

    it('accepts het for the other meaning of a word with two nouns, and either when the meaning is unclear', () => {
      const result = checkWithTestSnapshot([
        pack('army', '{ id: army-01, dutch: appel, english: roll call, pos: noun, article: het }'),
        pack('law', '{ id: law-01, dutch: appel, english: [to appeal, an appeal], pos: noun, article: het }'),
        pack('misc', '{ id: misc-01, dutch: appel, english: something else, pos: noun, article: de }'),
      ]);

      expect(result.ok ? [] : result.errors).toEqual([]);
    });

    it('stores the Dutch word without stray spaces', () => {
      const result = checkWithTestSnapshot([pack('food', '{ id: food-01, dutch: " appel ", english: apple, pos: noun, article: de }')]);

      expect(result.ok && result.packs[0].cards[0].dutch).toBe('appel');
    });

    it('spots de or het in the Dutch word even when the article is missing', () => {
      const errors = errorsOf(checkWithTestSnapshot([pack('food', '{ id: food-01, dutch: het boek, english: book, pos: noun }')]));

      expect(errors).toEqual([
        'content/packs/food.yaml, Card food-01: write "boek" in "dutch" without "het" in front; the article goes in "article".',
      ]);
    });

    it('accepts either article for a noun Wiktionary lists with both', () => {
      const result = checkWithTestSnapshot([
        pack(
          'misc',
          '{ id: misc-01, dutch: pad, english: toad, pos: noun, article: de }',
          '{ id: misc-02, dutch: pad, english: path, pos: noun, article: het }',
        ),
      ]);

      expect(result.ok ? [] : result.errors).toEqual([]);
    });

    it('matches Wiktionary regardless of capital letters and spaces around the word', () => {
      const result = checkWithTestSnapshot([pack('food', '{ id: food-01, dutch: " Appel ", english: apple, pos: noun, article: de }')]);

      expect(result.ok ? [] : result.errors).toEqual([]);
    });

    it('explains a noun that is not in the Wiktionary snapshot', () => {
      const errors = errorsOf(checkWithTestSnapshot([pack('food', '{ id: food-01, dutch: apel, english: apple, pos: noun, article: de }')]));

      expect(errors).toEqual([
        'content/packs/food.yaml, Card food-01: "apel" is not in the Wiktionary snapshot, so its article cannot be checked. Check the spelling (Dutch nouns are written in lower case, without de or het in front).',
      ]);
    });

    it('spots de or het written into the Dutch word itself', () => {
      const errors = errorsOf(checkWithTestSnapshot([pack('food', '{ id: food-01, dutch: de appel, english: apple, pos: noun, article: de }')]));

      expect(errors).toEqual([
        'content/packs/food.yaml, Card food-01: write "appel" in "dutch" without "de" in front; the article goes in "article".',
      ]);
    });
  });

  describe('duplicate Cards', () => {
    it('rejects the same word twice in one Pack, naming both Cards', () => {
      const errors = errorsOf(
        checkWithTestSnapshot([
          pack(
            'food',
            '{ id: food-01, dutch: appel, english: apple, pos: noun, article: de }',
            '{ id: food-02, dutch: water, english: water, pos: noun, article: het }',
            '{ id: food-03, dutch: Appel, english: an apple, pos: noun, article: de }',
          ),
        ]),
      );

      expect(errors).toEqual([
        'content/packs/food.yaml, Card food-03: "Appel" is already in this Pack as Card food-01. Remove one of them, or put both meanings in one Card.',
      ]);
    });

    it('allows the same word in two different Packs', () => {
      const result = checkWithTestSnapshot([
        pack('food', '{ id: food-01, dutch: water, english: water, pos: noun, article: het }'),
        pack('drinks', '{ id: drinks-01, dutch: water, english: water, pos: noun, article: het }'),
      ]);

      expect(result.ok ? [] : result.errors).toEqual([]);
    });
  });
});

describe('checkDictionary', () => {
  const DICTIONARY_PATH = 'content/dictionary/dictionary.yaml';
  const dictionary = (...entries: string[]) => ({ path: DICTIONARY_PATH, text: `entries:\n${entries.map((e) => `  - ${e}\n`).join('')}` });
  const packs: Pack[] = [{ id: 'hello', title: 'Hello', cards: [{ id: 'hello-05', dutch: 'naam', english: ['name'], pos: 'noun', article: 'de' }] }];
  const check = (file: { path: string; text: string }) => checkDictionary(file, wiktionary, packs);
  const errorsOfDictionary = (result: ReturnType<typeof checkDictionary>) => {
    if (result.ok) throw new Error('expected the check to fail');
    return result.errors;
  };

  it('turns a valid Dictionary file into entries with the same fields as Cards', () => {
    const result = check(
      dictionary('{ id: dict-boek, dutch: boek, english: book, pos: noun, article: het }', '{ id: dict-ja, dutch: ja, english: yes, pos: interjection }'),
    );

    expect(result).toEqual({
      ok: true,
      entries: [
        { id: 'dict-boek', dutch: 'boek', english: ['book'], pos: 'noun', article: 'het' },
        { id: 'dict-ja', dutch: 'ja', english: ['yes'], pos: 'interjection' },
      ],
    });
  });

  it('checks entries with the Card rules, including de/het against Wiktionary', () => {
    const errors = errorsOfDictionary(
      check(dictionary('{ id: dict-boek, dutch: boek, english: book, pos: noun, article: de }', '{ id: dict-ja, dutch: ja, pos: interjection }')),
    );

    expect(errors).toEqual([
      `${DICTIONARY_PATH}, entry dict-boek: "boek" says de, but Wiktionary says het.`,
      `${DICTIONARY_PATH}, entry dict-ja: "english" is missing (give one meaning, or a list of meanings).`,
    ]);
  });

  it('suggests a Dictionary-style id when one is missing', () => {
    const errors = errorsOfDictionary(check(dictionary('{ dutch: ja, english: yes, pos: interjection }')));

    expect(errors).toEqual([`${DICTIONARY_PATH}, entry #1: "id" is missing (every entry needs a unique id, like dict-ja).`]);
  });

  it('rejects ids used twice in the Dictionary or already used by a Pack Card', () => {
    const errors = errorsOfDictionary(
      check(
        dictionary(
          '{ id: dict-ja, dutch: ja, english: yes, pos: interjection }',
          '{ id: dict-ja, dutch: nee, english: no, pos: interjection }',
          '{ id: hello-05, dutch: boek, english: book, pos: noun, article: het }',
        ),
      ),
    );

    expect(errors).toEqual([
      `${DICTIONARY_PATH}: id "dict-ja" is used by more than one entry. Every entry id must be unique.`,
      `${DICTIONARY_PATH}: id "hello-05" is already used by a Card in the Pack "hello". Give the entry a different id.`,
    ]);
  });

  it('rejects the same word twice', () => {
    const errors = errorsOfDictionary(
      check(dictionary('{ id: dict-ja, dutch: ja, english: yes, pos: interjection }', '{ id: dict-ja-2, dutch: Ja, english: yeah, pos: interjection }')),
    );

    expect(errors).toEqual([
      `${DICTIONARY_PATH}, entry dict-ja-2: "Ja" is already in the Dictionary as entry dict-ja. Remove one of them, or put both meanings in one entry.`,
    ]);
  });

  it('explains a file that is not a list of entries', () => {
    expect(errorsOfDictionary(check({ path: DICTIONARY_PATH, text: 'words: []' }))).toEqual([
      `${DICTIONARY_PATH}: the Dictionary needs an "entries" list with at least one entry.`,
    ]);
    expect(errorsOfDictionary(check({ path: DICTIONARY_PATH, text: 'entries: [oops' }))[0]).toMatch(/is not valid YAML/);
  });
});

describe('Cognates, False friends and Facts', () => {
  it('reads the optional notes on Cards and Facts on the Pack, each Fact knowing where it belongs', () => {
    const result = checkWithTestSnapshot([
      {
        path: 'content/packs/food.yaml',
        text: `
title: Food
facts:
  - The Dutch eat chocolate sprinkles (hagelslag) on bread.
cards:
  - id: food-01
    dutch: appel
    english: apple
    pos: noun
    article: de
    cognate: true
    fact: Apple pie (appeltaart) is a Dutch favourite.
  - id: food-02
    dutch: brutaal
    english: cheeky
    pos: adjective
    false-friend: brutal
  - id: food-03
    dutch: water
    english: water
    pos: noun
    article: het
    cognate: false
`,
      },
    ]);

    expect(result.ok ? undefined : result.errors).toBeUndefined();
    if (!result.ok) return;
    const [food] = result.packs;
    expect(food.facts).toEqual([{ text: 'The Dutch eat chocolate sprinkles (hagelslag) on bread.', about: { kind: 'pack', id: 'food' } }]);
    expect(food.cards[0]).toMatchObject({ cognate: true, fact: { text: 'Apple pie (appeltaart) is a Dutch favourite.', about: { kind: 'card', id: 'food-01' } } });
    expect(food.cards[1]).toMatchObject({ falseFriend: { looksLike: 'brutal' } });
    expect(food.cards[2]).toEqual({ id: 'food-03', dutch: 'water', english: ['water'], pos: 'noun', article: 'het' });
  });

  it('leaves Packs and Cards without notes exactly as before', () => {
    const result = checkWithTestSnapshot([hello]);

    expect(result.ok && result.packs[0]).toEqual({
      id: 'hello',
      title: 'Hello & being polite',
      cards: [
        { id: 'hello-01', dutch: 'hallo', english: ['hello'], pos: 'interjection' },
        { id: 'hello-02', dutch: 'dank je', english: ['thank you', 'thanks'], pos: 'phrase' },
      ],
    });
  });

  it('explains Cognate and False-friend fields written the wrong way', () => {
    const errors = errorsOf(
      checkWithTestSnapshot([
        pack(
          'words',
          '{ id: words-01, dutch: appel, english: apple, pos: noun, article: de, cognate: yes }',
          '{ id: words-02, dutch: brutaal, english: cheeky, pos: adjective, false-friend: [brutal] }',
          '{ id: words-03, dutch: slim, english: clever, pos: adjective, false-friend: slim, cognate: true }',
          '{ id: words-04, dutch: water, english: water, pos: noun, article: het, false-friend: Water }',
        ),
      ]),
    );

    expect(errors).toEqual([
      'content/packs/words.yaml, Card words-01: "cognate" must be true, or leave it out.',
      'content/packs/words.yaml, Card words-02: "false-friend" should be the English word it looks like (for brutaal, write: false-friend: brutal).',
      'content/packs/words.yaml, Card words-03: a Card can’t be both a Cognate and a False friend. Keep the one that fits.',
      'content/packs/words.yaml, Card words-04: "false-friend" says "water" looks like "Water", but that is also what it means. If it really means the same, write "cognate: true" instead.',
    ]);
  });

  it('wants each Fact to be one short piece of text', () => {
    const long = 'Dutch '.repeat(40).trim();
    const errors = errorsOf(
      checkWithTestSnapshot([
        {
          path: 'content/packs/facts.yaml',
          text: `
title: Facts
facts:
  - Fine.
  - ${long}
  - [not, text]
cards:
  - { id: facts-01, dutch: hallo, english: hello, pos: interjection, fact: [one, two] }
  - { id: facts-02, dutch: ja, english: yes, pos: interjection, fact: ${long} }
`,
        },
        { path: 'content/packs/single.yaml', text: 'title: Single\nfacts: 42\ncards:\n  - { id: single-01, dutch: nee, english: no, pos: interjection }\n' },
      ]),
    );

    expect(errors).toEqual([
      `content/packs/facts.yaml: Pack fact #2 is ${long.length} characters long; keep a Fact short (at most 200 characters).`,
      'content/packs/facts.yaml: Pack fact #3 should be one short sentence (text).',
      'content/packs/facts.yaml, Card facts-01: "fact" should be one short sentence (text).',
      `content/packs/facts.yaml, Card facts-02: "fact" is ${long.length} characters long; keep a Fact short (at most 200 characters).`,
      'content/packs/single.yaml: "facts" should be a list of short sentences, each on its own line starting with "- ".',
    ]);
  });

  it('explains that a Fact with a colon in it needs quotes', () => {
    const text = `
title: Tip
facts:
  - Fun fact: ja means yes.
cards:
  - { id: tip-01, dutch: nee, english: no, pos: interjection }
`;
    const errors = errorsOf(checkWithTestSnapshot([{ path: 'content/packs/tip.yaml', text }]));

    expect(errors).toEqual(['content/packs/tip.yaml: Pack fact #1 has a colon followed by a space, so put the whole Fact in double quotes: "like: this".']);
  });

  it('accepts a single Pack Fact written without a list', () => {
    const result = checkWithTestSnapshot([{ path: 'content/packs/one.yaml', text: 'title: One\nfacts: Hallo is hello.\ncards:\n  - { id: one-01, dutch: ja, english: yes, pos: interjection }\n' }]);

    expect(result.ok && result.packs[0].facts).toEqual([{ text: 'Hallo is hello.', about: { kind: 'pack', id: 'one' } }]);
  });

  it('catches misspelt field names, so a note is never silently lost', () => {
    const errors = errorsOf(
      checkWithTestSnapshot([
        {
          path: 'content/packs/typos.yaml',
          text: `
title: Typos
fact: The Pack field is called facts.
cards:
  - { id: typos-01, dutch: brutaal, english: cheeky, pos: adjective, falsefriend: brutal }
`,
        },
      ]),
    );

    expect(errors).toEqual([
      'content/packs/typos.yaml: "fact" is not a Pack field. Check the spelling; a Pack has: title, facts, cards.',
      'content/packs/typos.yaml, Card typos-01: "falsefriend" is not a Card field. Check the spelling; a Card has: id, dutch, english, pos, article, cognate, false-friend, fact.',
    ]);
  });
});

describe('checkDictionary notes', () => {
  it('names a misspelt field on an entry as an entry field', () => {
    const result = checkDictionary({ path: 'content/dictionary/dictionary.yaml', text: 'entries:\n  - { id: dict-ja, dutch: ja, english: yes, pos: interjection, cognat: true }\n' }, wiktionary, []);

    expect(result.ok ? [] : result.errors).toEqual([
      'content/dictionary/dictionary.yaml, entry dict-ja: "cognat" is not an entry field. Check the spelling; an entry has: id, dutch, english, pos, article, cognate, false-friend, fact.',
    ]);
  });
});
