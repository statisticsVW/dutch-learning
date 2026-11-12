// Run with `npm run build:dictionary`. Fills content/dictionary/dictionary.yaml up to about 3,000 words:
//
// 1. NT2Lex (sources/nt2lex/) picks the words: single words that learner texts at CEFR A1 or A2 use,
//    most frequent first.
// 2. English Wiktionary gives each word's English meanings (and a noun's gender). Pages are read
//    through the MediaWiki API once and the senses kept in sources/wiktionary/dutch-senses.json, so a
//    rebuild only asks Wiktionary about words it has not seen.
// 3. Nouns take their article from the Wiktionary snapshot the content check uses, and the result is
//    checked with the same rules as the app build before it is written.
//
// Entries already in dictionary.yaml are kept exactly as they are (ids never change, and the Curator's
// fixes survive a rebuild); only missing words are added. Sources and licences: the README.md in each
// folder under sources/, and content/dictionary/README.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { stringify } from 'yaml';
import { checkContent, checkDictionary, formatErrors } from '../src/content/check.ts';
import type { DictionaryEntry } from '../src/content/types.ts';
import { DICTIONARY_PATH, readArticleSnapshot, readDictionaryFile, readPackFiles } from './read-content.ts';
import { readNt2Lex } from './nt2lex.ts';
import { buildDictionaryEntries } from './dictionary-entries.ts';
import { dutchSenses, type DutchSenses } from './wiktionary-senses.ts';
import { pageTexts } from './wiktionary-api.ts';

const TARGET = 3000;
const NT2LEX_PATH = 'sources/nt2lex/NT2Lex-CGN-v01.tsv';
const SENSES_PATH = 'sources/wiktionary/dutch-senses.json';
/** Words looked up per round; rounds stop once the Dictionary reaches its target. */
const ROUND = 250;
/** Words NT2Lex lists that a young Learner's Dictionary leaves out. Wiktionary's labels catch most others. */
const LEFT_OUT = new Set(['shit', 'seks']);

const snapshot = readArticleSnapshot();
const packs = checkContent(readPackFiles(), snapshot);
if (!packs.ok) throw new Error(formatErrors(packs.errors));
const current = checkDictionary(readDictionaryFile(), snapshot, packs.packs);
if (!current.ok) throw new Error(formatErrors(current.errors));

const candidates = readNt2Lex(readFileSync(NT2LEX_PATH, 'utf8')).filter((c) => !LEFT_OUT.has(c.word));
const senses = readSenses();
let entries: DictionaryEntry[];
for (;;) {
  entries = buildDictionaryEntries({ candidates, senses, snapshot, existing: current.entries, target: TARGET });
  const unread = [...new Set(candidates.map((c) => c.word))].filter((w) => !Object.hasOwn(senses, w));
  if (entries.length >= TARGET || unread.length === 0) break;
  const words = unread.slice(0, ROUND);
  const texts = await pageTexts(words, 'Wiktionary pages');
  for (const word of words) senses[word] = dutchSenses(texts.get(word) ?? '');
  writeSenses(senses);
  console.log(`${entries.length} entries so far.`);
}

// Check the result with the app build's own rules before writing it.
const text = dictionaryYaml(entries);
const checked = checkDictionary({ path: DICTIONARY_PATH, text }, snapshot, packs.packs);
if (!checked.ok) throw new Error(formatErrors(checked.errors));
writeFileSync(DICTIONARY_PATH, text);
console.log(`Wrote ${entries.length} entries (${entries.length - current.entries.length} new) to ${DICTIONARY_PATH}.`);

function readSenses(): Record<string, DutchSenses> {
  if (!existsSync(SENSES_PATH)) return {};
  return (JSON.parse(readFileSync(SENSES_PATH, 'utf8')) as { words: Record<string, DutchSenses> }).words;
}

/** One word per line, sorted, so a rebuild shows up as a readable diff. */
function writeSenses(words: Record<string, DutchSenses>) {
  const header = {
    about: 'The current Dutch senses English Wiktionary gives each word NT2Lex lists at A1 or A2, by part of speech. Read by `npm run build:dictionary`.',
    source: 'English Wiktionary (https://en.wiktionary.org), page wikitext read through the MediaWiki API',
    licence: 'CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/ (Wiktionary contributors)',
    retrieved: new Date().toLocaleDateString('sv-SE'), // YYYY-MM-DD, local time
  };
  const lines = [
    '{',
    ...Object.entries(header).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`),
    '  "words": {',
    Object.keys(words)
      .sort()
      .map((word) => `    ${JSON.stringify(word)}: ${JSON.stringify(words[word])}`)
      .join(',\n'),
    '  }',
    '}',
  ];
  writeFileSync(SENSES_PATH, `${lines.join('\n')}\n`);
}

function dictionaryYaml(all: DictionaryEntry[]): string {
  const sorted = [...all].sort((a, b) => a.dutch.localeCompare(b.dutch, 'nl') || a.pos.localeCompare(b.pos) || a.id.localeCompare(b.id));
  return [
    '# The Dictionary: common Dutch words the Learner can search and add to Mijn woorden.',
    '# Built by `npm run build:dictionary` from NT2Lex and English Wiktionary; see README.md in this folder.',
    '# Each entry is checked like a Card: id (unique across all content, never reuse or change it),',
    '# dutch, english, pos, and for nouns an article (de or het) that must agree with Wiktionary.',
    '# You can fix an entry by hand: a rebuild keeps every entry already here as it is.',
    'entries:',
    ...sorted.map((entry) => `  - ${entryYaml(entry)}`),
    '',
  ].join('\n');
}

/** An entry as one line of YAML, with the same field names a Pack file uses. */
function entryYaml({ id, dutch, english, pos, article, cognate, falseFriend, fact }: DictionaryEntry): string {
  const fields: Record<string, unknown> = { id, dutch, english: english.length === 1 ? english[0] : english, pos };
  if (article) fields.article = article;
  if (cognate) fields.cognate = true;
  if (falseFriend) fields['false-friend'] = falseFriend.looksLike;
  if (fact) fields.fact = fact.text;
  return stringify(fields, { collectionStyle: 'flow', lineWidth: 0 }).trim();
}
