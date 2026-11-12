# Curator guide: editing Packs

You can add and fix words without touching any code. Every Pack is one text file in
[`content/packs/`](../content/packs). Edit it on GitHub (open the file, click the pencil),
commit, and the site checks your change and updates itself within a few minutes.

## The Pack file format

A Pack file is [YAML](https://yaml.org): plain text where indentation (spaces, never tabs) matters.
The file name becomes the Pack's name, so `food.yaml` is the "food" Pack.

```yaml
title: Food
cards:
  - id: food-01
    dutch: appel
    english: apple
    pos: noun
    article: de
  - id: food-02
    dutch: eten
    english: [to eat, food]
    pos: verb
```

Every Card has:

| Field     | What to write                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------- |
| `id`      | A name for the Card that is unique across **all** Packs, like `food-01`. Never change or reuse an id: the Learner's progress is stored under it. |
| `dutch`   | The Dutch word or short phrase. Nouns go in lower case **without** de/het in front.              |
| `english` | One meaning, or a list of meanings in square brackets: `[to eat, food]`.                         |
| `pos`     | Part of speech: noun, verb, adjective, adverb, pronoun, preposition, conjunction, numeral, interjection or phrase. |
| `article` | Nouns only: `de` or `het`. Leave it out for everything else.                                     |

To add a Pack, add a new `.yaml` file to `content/packs/` with a `title` and at least one Card.

## Cognates, False friends and Facts (optional)

These notes make Dutch feel discoverable. Add them to any Card, in the same Pack file:

```yaml
title: Food
facts:
  - The Dutch put chocolate sprinkles (hagelslag) on their bread.
cards:
  - id: food-01
    dutch: appel
    english: apple
    pos: noun
    article: de
    cognate: true
    fact: Appeltaart (apple pie) is a Dutch favourite.
  - id: food-02
    dutch: brutaal
    english: cheeky
    pos: adjective
    false-friend: brutal
```

| Field          | Where      | What to write                                                                                     |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `cognate`      | Card       | `true` for a word an English speaker can already guess (appel, water). The app says "You already know this one!" |
| `false-friend` | Card       | The English word it **looks like** but doesn't mean (brutaal → `brutal`). The real meaning stays in `english`. The app warns before the answer and explains the trap after it. |
| `fact`         | Card       | One short "did you know" sentence, shown after the Learner answers the Card.                     |
| `facts`        | Pack (top) | A list of short sentences, each on its own line starting with `- `. One is shown after each group of new Cards from the Pack. |

A Card is either a Cognate or a False friend, never both. Keep each Fact under 200 characters.
Every field is checked by name, so a misspelt one (`falsefriend`, `fact` at the top of the
Pack) fails the check instead of being quietly ignored. Dictionary entries may use the same
Card notes.

## When the check fails

If something is wrong, the site is **not** updated: the Learner keeps the last good version.
On GitHub, open the **Actions** tab, click the failed run (red ✗), then the **check** job and the
**Content check** step. It lists each problem with the file and Card id, for example:

```
- content/packs/food.yaml, Card food-07: "appel" says het, but Wiktionary says de.
```

Fix the Card it names, commit again, and the check reruns. What the common messages mean:

| Message says…                                     | What to do                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `this file is not valid YAML`                     | Look near the line it mentions for a missing colon, wrong indentation or an unclosed `[`.      |
| `"…" is missing`                                  | Add the field it names to that Card.                                                           |
| `is a noun, so it needs an "article"`             | Add `article: de` or `article: het`.                                                           |
| `must be de or het (in lower case)`               | Fix the spelling of the article.                                                               |
| `only nouns have an article`                      | Remove the `article` line, or set `pos: noun` if it really is a noun.                          |
| `says het, but Wiktionary says de` (or the other way) | The article is almost certainly wrong: change it to what Wiktionary says.                  |
| `Wiktionary says de for "apple" (het appel means: …)` | The same spelling is two different nouns. Use the article for the meaning in your Card's `english`. |
| `is not in the Wiktionary snapshot`               | Check the spelling. If it is right, the word may be missing from Wiktionary's lists (often long compound words): pick a simpler word, or ask whoever maintains the code to look at it. |
| `without "de" in front`                           | Move the article out of `dutch` and into `article`.                                            |
| `is already in this Pack as Card …`               | The same word is in the Pack twice: delete one Card, or merge the meanings into one Card's `english` list. |
| `Card id "…" is used more than once`              | Give the newer Card a fresh id. Don't change the id of a Card that has been live for a while. |
| `another Pack file … has the same name`           | Two files differ only by `.yaml`/`.yml`: rename or merge them.                                 |
| `is not a Card field` (or Pack, entry)            | A field name is misspelt. Use one of the names the message lists.                              |
| `"cognate" must be true`                          | Write `cognate: true` (not `yes`), or remove the line.                                         |
| `"false-friend" should be the English word`       | Write the one English word it looks like: `false-friend: brutal`.                              |
| `can't be both a Cognate and a False friend`      | Keep only the one that fits.                                                                   |
| `but that is also what it means`                  | The word means what it looks like, so it is a Cognate: write `cognate: true` instead.          |
| `keep a Fact short` / `should be one short sentence` | Shorten the Fact to under 200 characters, as plain text on one line.                        |
| `has a colon followed by a space`                 | Put the whole Fact in double quotes: `- "Fun fact: ja means yes."`                             |
| `the name "mijn-woorden" is kept`                  | That name belongs to the Learner's own Pack. Rename your file.                                 |
| `is already used by a Card in the Pack …`         | A Dictionary entry has the same id as a Pack Card: give the entry a fresh id.                  |

## The Dictionary

The Learner can search the Dictionary and add words to his own Pack, Mijn woorden. It lives in
[`content/dictionary/dictionary.yaml`](../content/dictionary/dictionary.yaml), one entry per line:

```yaml
entries:
  - { id: dict-boek, dutch: boek, english: book, pos: noun, article: het }
  - { id: dict-lezen, dutch: lezen, english: to read, pos: verb }
```

Entries have the same fields as Cards and the check applies the same rules. Ids must be unique
across the Dictionary **and** all Packs; start them with `dict-`. Fixing an entry's meaning or
spelling also fixes it in the Learner's Mijn woorden the next time he opens the Dictionary. See
[`content/dictionary/README.md`](../content/dictionary/README.md) for its sources and licence.

## Where the de/het check comes from

Nouns are checked against a copy of the noun genders listed on
[English Wiktionary](https://en.wiktionary.org), kept in
[`content/wiktionary/articles.json`](../content/wiktionary/articles.json). That copy is refreshed
occasionally with `npm run snapshot:wiktionary`; see
[`content/wiktionary/README.md`](../content/wiktionary/README.md).
