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

## Where the de/het check comes from

Nouns are checked against a copy of the noun genders listed on
[English Wiktionary](https://en.wiktionary.org), kept in
[`content/wiktionary/articles.json`](../content/wiktionary/articles.json). That copy is refreshed
occasionally with `npm run snapshot:wiktionary`; see
[`content/wiktionary/README.md`](../content/wiktionary/README.md).
