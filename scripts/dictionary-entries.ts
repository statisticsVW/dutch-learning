// Turns NT2Lex's word list and Wiktionary's senses into Dictionary entries. Pure; used by build-dictionary.ts.
import { slugOf, type ArticleSnapshot } from '../src/content/check.ts';
import { ARTICLES, type Article, type DictionaryEntry, type PartOfSpeech } from '../src/content/types.ts';
import { wordKey, type Nt2LexWord } from './nt2lex.ts';
import type { DutchSense, DutchSenses } from './wiktionary-senses.ts';

const MAX_MEANINGS = 3;
const MAX_MEANING_LENGTH = 40;
/** A meaning is plain words: letters, spaces, hyphens, apostrophes and dots ("Mr."). */
const PLAIN_MEANING = /^\p{L}[\p{L}\p{M} '’.-]*$/u;

/** A meaning has at most this many words, not counting "to" in front of a verb. */
const MAX_MEANING_WORDS = 4;
/** A sense longer than this is a definition ("a central office in any business …"), not a translation. */
const MAX_SENSE_LENGTH = 60;

/** Senses after the first are usually narrower; only a short start of one is worth showing. */
const MAX_LATER_MEANING_WORDS = 2;

/**
 * Wiktionary senses → up to three short English meanings, without explanations in brackets.
 * The first sense gives all its meanings ("house, home"); a later sense, or one that explains rather
 * than translates ("murder, a type of killing …"), gives only its first one, and only if it is short.
 */
export function shortMeanings(senses: string[], pos: PartOfSpeech): string[] {
  const meanings: string[] = [];
  senses.forEach((sense, index) => {
    const text = withoutBrackets(sense).split(';')[0].replace(/\.$/, '');
    const explains = text.length > MAX_SENSE_LENGTH || text.includes(':');
    const all = text.split(/[,:]/).map((p) => p.replace(/\s+/g, ' ').trim());
    const pieces = index === 0 && !explains ? all : all.slice(0, 1);
    pieces.forEach((raw, at) => {
      if (meanings.length === MAX_MEANINGS) return;
      // "destructive, catastrophic fire": the first adjective belongs with the noun after it.
      if (ADJECTIVE.test(raw) && ADJECTIVE.test(pieces[at + 1]?.split(' ')[0] ?? '')) return;
      if (EXPLANATION_START.test(raw)) return;
      let piece = pos === 'noun' ? raw.replace(/^an? /i, '') : raw;
      if (pos === 'verb' && piece && !VERB_START.test(`${piece} `)) piece = `to ${piece}`;
      const maxWords = index === 0 ? MAX_MEANING_WORDS : MAX_LATER_MEANING_WORDS;
      if (isUsableMeaning(piece, maxWords, all.length === 1) && !meanings.includes(piece)) meanings.push(piece);
    });
  });
  return meanings;
}

/** A verb meaning that needs no "to" in front: it has one, or it is a modal ("may", "can"). */
const VERB_START = /^(?:to|may|can|must|shall|should|will|would|might|could) /;
/** A single English word that looks like an adjective ("destructive", "catastrophic"). */
const ADJECTIVE = /^\p{Ll}+(?:ive|ous|ful|ic)$/u;
/** How a fragment of an explanation starts: "like using a bell", "from moderate to heat". */
const EXPLANATION_START = /^(?:or|and|like|from|especially|such as|as|usually|often) /;

/**
 * Short plain words, not a fragment of a longer explanation ("or young unmarried noblewoman").
 * "And" or "or" is fine in a sense that is one piece, but not in a split-off piece ("terrifying and dangerous creature").
 */
function isUsableMeaning(meaning: string, maxWords: number, wholeSense: boolean): boolean {
  const words = meaning.replace(/^to /, '').split(' ').length;
  return (
    words <= maxWords &&
    meaning.length <= MAX_MEANING_LENGTH &&
    !EXPLANATION_START.test(meaning) &&
    (wholeSense || !/ (?:and|or) /.test(meaning)) &&
    PLAIN_MEANING.test(meaning)
  );
}

export type DictionaryInputs = {
  /** NT2Lex's words, most frequent first. */
  candidates: Nt2LexWord[];
  /** Wiktionary's senses for each word (words not looked up yet are missing). */
  senses: Record<string, DutchSenses>;
  snapshot: ArticleSnapshot;
  /** Entries already in the Dictionary: kept as they are, so ids and the Curator's fixes never change. */
  existing: DictionaryEntry[];
  /** How many entries the Dictionary should have in all. */
  target: number;
};

/** The existing entries, then the most frequent candidates that have English meanings (and, for nouns, a checked article). */
export function buildDictionaryEntries({ candidates, senses, snapshot, existing, target }: DictionaryInputs): DictionaryEntry[] {
  const entries = [...existing];
  const has = new Set(existing.map((e) => wordKey(e.dutch, e.pos)));
  const ids = new Set(existing.map((e) => e.id));
  for (const { word, pos } of candidates) {
    if (entries.length >= target) break;
    if (has.has(wordKey(word, pos))) continue;
    const page = senses[word] ?? {};
    // Dutch uses most adjectives as adverbs too (snel: fast, quickly), and NT2Lex tags both uses as adjective.
    const wordSenses = pos === 'adjective' ? [...(page.adjective ?? []), ...(page.adverb ?? [])] : (page[pos] ?? []);
    const entry = entryFor(word, pos, wordSenses, snapshot);
    if (!entry) continue;
    const slug = slugOf(word);
    const id = ids.has(`dict-${slug}`) ? `dict-${slug}-${pos}` : `dict-${slug}`;
    if (ids.has(id)) continue;
    entries.push({ id, ...entry });
    has.add(wordKey(word, pos));
    ids.add(id);
  }
  return entries;
}

/** Undefined when Wiktionary gives no usable meaning, or (for a noun) no article the content check would accept. */
function entryFor(dutch: string, pos: PartOfSpeech, senses: DutchSense[], snapshot: ArticleSnapshot): Omit<DictionaryEntry, 'id'> | undefined {
  if (pos !== 'noun') {
    const english = shortMeanings(senses.map((s) => s.text), pos);
    return english.length > 0 ? { dutch, english, pos } : undefined;
  }
  const known = Object.hasOwn(snapshot, dutch) ? snapshot[dutch] : undefined;
  if (!known) return undefined;
  const accepted: readonly Article[] = Array.isArray(known) ? known : ARTICLES;
  // The article of the noun the first sense belongs to; with no gender on the page, the snapshot's only article.
  const first = senses[0];
  const article = first?.articles.find((a) => accepted.includes(a)) ?? (accepted.length === 1 && first?.articles.length === 0 ? accepted[0] : undefined);
  if (!article) return undefined;
  const english = shortMeanings(
    senses.filter((s) => s.articles.length === 0 || s.articles.includes(article)).map((s) => s.text),
    pos,
  );
  return english.length > 0 ? { dutch, english, pos, article } : undefined;
}

function withoutBrackets(text: string): string {
  let result = text;
  for (let previous = ''; previous !== result; ) {
    previous = result;
    result = result.replace(/\([^()]*\)/g, '');
  }
  return result;
}
