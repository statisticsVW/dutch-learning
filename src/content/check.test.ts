import { describe, expect, it } from 'vitest';
import { checkContent } from './check';

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
    const result = checkContent([hello, food]);

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
    const errors = errorsOf(checkContent([{ path: 'content/packs/bad.yaml', text: 'title: [oops\ncards:' }]));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^content\/packs\/bad\.yaml: this file is not valid YAML/);
  });

  it('reports a missing title and a missing card list', () => {
    const errors = errorsOf(checkContent([{ path: 'content/packs/empty.yaml', text: 'cards: []' }]));

    expect(errors).toEqual([
      'content/packs/empty.yaml: the Pack needs a "title" (text).',
      'content/packs/empty.yaml: the Pack needs a "cards" list with at least one Card.',
    ]);
  });

  it('points to the exact Card when a field is missing or the wrong kind', () => {
    const errors = errorsOf(
      checkContent([
        {
          path: 'content/packs/animals.yaml',
          text: `
title: Animals
cards:
  - id: animals-01
    english: dog
    pos: noun
  - dutch: kat
    english: cat
    pos: noun
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

    const errors = errorsOf(checkContent([hello, copy]));

    expect(errors).toEqual([
      'content/packs/greetings.yaml: Card id "hello-01" is used more than once (also in content/packs/hello.yaml). Every Card id must be unique.',
      'content/packs/greetings.yaml: Card id "greet-02" is used more than once (also in content/packs/greetings.yaml). Every Card id must be unique.',
    ]);
  });

  it('rejects two Pack files that would get the same Pack id', () => {
    const errors = errorsOf(checkContent([food, { ...food, path: 'content/packs/food.yml', text: food.text.replace('food-01', 'food-02') }]));

    expect(errors).toEqual([
      'content/packs/food.yml: another Pack file (content/packs/food.yaml) has the same name. Rename one of them.',
    ]);
  });

  it('fails when there are no Pack files at all', () => {
    expect(errorsOf(checkContent([]))).toEqual(['No Pack files were found in content/packs.']);
  });
});
