// The content check: turns the Curator's Pack files into validated content,
// or into a plain-language list of what needs fixing. Runs at build time.
import { parse } from 'yaml';
import { ARTICLES, PARTS_OF_SPEECH, type Article, type Card, type DictionaryEntry, type Pack, type PartOfSpeech, MY_WORDS_PACK_ID } from './types.ts';

export type PackFile = { path: string; text: string };

export type CheckResult = { ok: true; packs: Pack[] } | { ok: false; errors: string[] };

export type DictionaryCheckResult = { ok: true; entries: DictionaryEntry[] } | { ok: false; errors: string[] };

/**
 * What Wiktionary says about each Dutch noun's article, keyed by the word as Wiktionary spells it.
 * Usually just the article. A word that is really two nouns (de appel "apple", het appel "appeal")
 * lists each article's English meanings instead, so a Card can be checked by its meaning.
 * Built by `npm run snapshot:wiktionary` into content/wiktionary/articles.json.
 */
export type ArticleSnapshot = Readonly<Record<string, readonly Article[] | MeaningsByArticle>>;

export type MeaningsByArticle = Readonly<Record<Article, readonly string[]>>;

type CheckedPack = { path: string; pack: Pack };

const POS_CHOICES = PARTS_OF_SPEECH.join(', ');

export function checkContent(files: PackFile[], wiktionary: ArticleSnapshot): CheckResult {
  if (files.length === 0) return { ok: false, errors: ['No Pack files were found in content/packs.'] };

  const errors: string[] = [];
  const checked: CheckedPack[] = [];
  for (const file of files) {
    const pack = checkPackFile(file, wiktionary, errors);
    if (pack) checked.push({ path: file.path, pack });
  }
  checkUniquePackIds(checked, errors);
  checkUniqueCardIds(checked, errors);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, packs: checked.map((c) => c.pack) };
}

/** The Curator-facing report for a failed check, one problem per line. */
export function formatErrors(errors: string[]): string {
  return `The content check found ${errors.length} problem(s):\n\n${errors.map((e) => `- ${e}`).join('\n')}`;
}

/**
 * Checks the Dictionary file: every entry follows the Card rules (including de/het against Wiktionary),
 * no word appears twice, and ids are unique across the Dictionary and the already-checked Packs,
 * because the Learner's progress on a word he adds is kept under its id.
 */
export function checkDictionary(file: PackFile, wiktionary: ArticleSnapshot, packs: Pack[]): DictionaryCheckResult {
  const errors: string[] = [];
  const data = parseYaml(file, errors);
  if (errors.length > 0) return { ok: false, errors };

  const rawEntries = isRecord(data) ? data.entries : undefined;
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    return { ok: false, errors: [`${file.path}: the Dictionary needs an "entries" list with at least one entry.`] };
  }

  const entries: DictionaryEntry[] = [];
  rawEntries.forEach((raw, index) => {
    const example = isRecord(raw) && isText(raw.dutch) ? `dict-${slugOf(raw.dutch)}` : 'dict-woord';
    const entry = checkCard(raw, index, file.path, { noun: 'entry', idExample: example }, wiktionary, errors);
    if (entry) entries.push(entry);
  });
  checkNoDuplicateCards(entries, file.path, { noun: 'entry', place: 'the Dictionary' }, errors);

  const packOf = new Map(packs.flatMap((p) => p.cards.map((c) => [c.id, p.id] as const)));
  const seen = new Set<string>();
  for (const { id } of entries) {
    if (seen.has(id)) errors.push(`${file.path}: id "${id}" is used by more than one entry. Every entry id must be unique.`);
    else if (packOf.has(id)) errors.push(`${file.path}: id "${id}" is already used by a Card in the Pack "${packOf.get(id)}". Give the entry a different id.`);
    seen.add(id);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, entries };
}

/** The file's YAML, or undefined with a plain-language error when it does not parse. */
function parseYaml(file: PackFile, errors: string[]): unknown {
  try {
    return parse(file.text);
  } catch (e) {
    const detail = e instanceof Error ? e.message.split('\n')[0] : String(e);
    errors.push(`${file.path}: this file is not valid YAML (${detail}). Check indentation, colons and brackets.`);
    return undefined;
  }
}

function checkPackFile(file: PackFile, wiktionary: ArticleSnapshot, errors: string[]): Pack | undefined {
  const before = errors.length;
  const data = parseYaml(file, errors);
  if (errors.length > before) return undefined;

  const fileError = (message: string) => errors.push(`${file.path}: ${message}`);
  if (!isRecord(data)) {
    fileError('the file should describe one Pack, starting with "title:" and "cards:".');
    return undefined;
  }

  const title = data.title;
  if (!isText(title)) fileError('the Pack needs a "title" (text).');

  const rawCards = data.cards;
  const cards: Card[] = [];
  if (!Array.isArray(rawCards) || rawCards.length === 0) {
    fileError('the Pack needs a "cards" list with at least one Card.');
  } else {
    rawCards.forEach((raw, index) => {
      const idExample = `${packIdFromPath(file.path)}-${String(index + 1).padStart(2, '0')}`;
      const card = checkCard(raw, index, file.path, { noun: 'Card', idExample }, wiktionary, errors);
      if (card) cards.push(card);
    });
  }

  checkNoDuplicateCards(cards, file.path, { noun: 'Card', place: 'this Pack' }, errors);

  if (errors.length > before) return undefined;
  return { id: packIdFromPath(file.path), title: title as string, cards };
}

/** How errors name what is checked: a Pack's Card, or a Dictionary entry (not a Card until the Learner adds it). */
type Naming = { noun: 'Card' | 'entry'; /** Suggested when the id is missing. */ idExample: string };

function checkCard(raw: unknown, index: number, path: string, { noun, idExample }: Naming, wiktionary: ArticleSnapshot, errors: string[]): Card | undefined {
  const label = isRecord(raw) && isText(raw.id) ? `${noun} ${raw.id}` : `${noun} #${index + 1}`;
  const cardError = (message: string) => errors.push(`${path}, ${label}: ${message}`);
  if (!isRecord(raw)) {
    cardError('each Card should be a set of fields like "id:", "dutch:", "english:" and "pos:".');
    return undefined;
  }

  const before = errors.length;
  const { id, dutch, pos, article } = raw;
  if (!isText(id)) cardError(`"id" is missing (every ${noun} needs a unique id, like ${idExample}).`);
  if (!isText(dutch)) cardError('"dutch" is missing (it should be the Dutch word or phrase).');

  const english = typeof raw.english === 'string' ? [raw.english] : raw.english;
  if (english === undefined) cardError('"english" is missing (give one meaning, or a list of meanings).');
  else if (!Array.isArray(english) || !english.every(isText)) cardError('"english" must be a meaning, or a list of meanings.');
  else if (english.length === 0) cardError('"english" needs at least one meaning.');

  if (!isText(pos)) cardError(`"pos" (part of speech) is missing; it must be one of: ${POS_CHOICES}.`);
  else if (!PARTS_OF_SPEECH.includes(pos as PartOfSpeech)) cardError(`"pos" is "${pos}", but it must be one of: ${POS_CHOICES}.`);

  if (article !== undefined && !isText(article)) cardError('"article" must be text.');

  if (errors.length > before) return undefined;
  const card: Card = { id: id as string, dutch: (dutch as string).trim(), english: english as string[], pos: pos as PartOfSpeech };
  const checkedArticle = checkArticle(card, article as string | undefined, wiktionary, cardError);
  if (errors.length > before) return undefined;
  if (checkedArticle) card.article = checkedArticle;
  return card;
}

/** Nouns need de or het, agreeing with Wiktionary; other Cards have no article. Returns the valid article. */
function checkArticle(
  { dutch, english, pos }: Card,
  article: string | undefined,
  wiktionary: ArticleSnapshot,
  cardError: (message: string) => void,
): Article | undefined {
  if (pos !== 'noun') {
    if (article !== undefined) cardError('only nouns have an article. Remove "article", or change "pos" to noun.');
    return undefined;
  }

  const prefixed = /^(de|het)\s+(.+)$/i.exec(dutch);
  if (prefixed) {
    cardError(`write "${prefixed[2]}" in "dutch" without "${prefixed[1]}" in front; the article goes in "article".`);
  } else if (article === undefined) {
    cardError(`"${dutch}" is a noun, so it needs an "article": de or het.`);
  } else if (!isArticle(article)) {
    cardError(`"article" is "${article}", but it must be de or het (in lower case).`);
  } else {
    const mismatch = disagreement(dutch, english, article, lookUp(wiktionary, dutch));
    if (mismatch) cardError(mismatch);
    else return article;
  }
  return undefined;
}

/** Why Wiktionary disagrees with this noun's article, or undefined when it agrees. */
function disagreement(dutch: string, english: string[], article: Article, known: ArticleSnapshot[string] | undefined) {
  if (!known) {
    return `"${dutch}" is not in the Wiktionary snapshot, so its article cannot be checked. Check the spelling (Dutch nouns are written in lower case, without de or het in front).`;
  }
  if (isArticleList(known)) {
    return known.includes(article) ? undefined : `"${dutch}" says ${article}, but Wiktionary says ${known.join(' or ')}.`;
  }
  // Two nouns share this spelling: decide by meaning, and only object when the Card's English
  // clearly matches the other noun and not this one.
  const other: Article = article === 'de' ? 'het' : 'de';
  const meaning = english.find((e) => meansAnyOf(e, known[other]));
  if (!meaning || english.some((e) => meansAnyOf(e, known[article]))) return undefined;
  return `"${dutch}" says ${article}, but Wiktionary says ${other} for "${meaning}" (${article} ${dutch} means: ${known[article]
    .map(headword)
    .join('; ')}).`;
}

/** Whether an English meaning on a Card appears, as whole words, in one of Wiktionary's meanings. */
function meansAnyOf(english: string, wiktionaryMeanings: readonly string[]): boolean {
  const core = english.trim().toLowerCase().replace(/^(to|a|an|the)\s+/, '');
  if (!core) return false;
  const pattern = new RegExp(`(^|[^\\p{L}])${core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'u');
  return wiktionaryMeanings.some((m) => pattern.test(m.toLowerCase()));
}

/** A Wiktionary meaning without its explanation in brackets: "appeal (act of imploring)" → "appeal". */
function headword(meaning: string): string {
  return meaning.replace(/\s*\(.*$/, '');
}

function lookUp(wiktionary: ArticleSnapshot, word: string): ArticleSnapshot[string] | undefined {
  for (const key of [word, word.toLowerCase()]) {
    if (Object.hasOwn(wiktionary, key)) return wiktionary[key];
  }
  return undefined;
}

function isArticle(value: string): value is Article {
  return (ARTICLES as readonly string[]).includes(value);
}

function isArticleList(entry: ArticleSnapshot[string]): entry is readonly Article[] {
  return Array.isArray(entry);
}

/** The same word (and article) twice in one Pack, or in the Dictionary, is a duplicate; across Packs it is fine. */
function checkNoDuplicateCards(cards: Card[], path: string, { noun, place }: { noun: Naming['noun']; place: string }, errors: string[]) {
  const firstCard = new Map<string, Card>();
  for (const card of cards) {
    const key = [card.dutch.toLowerCase(), card.pos, card.article ?? ''].join('|');
    const first = firstCard.get(key);
    if (first) {
      errors.push(
        `${path}, ${noun} ${card.id}: "${card.dutch}" is already in ${place} as ${noun} ${first.id}. Remove one of them, or put both meanings in one ${noun}.`,
      );
    } else firstCard.set(key, card);
  }
}

function checkUniquePackIds(checked: CheckedPack[], errors: string[]) {
  const firstSeenIn = new Map<string, string>();
  for (const { path, pack } of checked) {
    const seen = firstSeenIn.get(pack.id);
    if (pack.id === MY_WORDS_PACK_ID) errors.push(`${path}: the name "${MY_WORDS_PACK_ID}" is kept for the Learner's own Pack, Mijn woorden. Rename the file.`);
    else if (seen) errors.push(`${path}: another Pack file (${seen}) has the same name. Rename one of them.`);
    else firstSeenIn.set(pack.id, path);
  }
}

function checkUniqueCardIds(checked: CheckedPack[], errors: string[]) {
  const firstSeenIn = new Map<string, string>();
  for (const { path, pack } of checked) {
    for (const card of pack.cards) {
      const seen = firstSeenIn.get(card.id);
      if (seen) errors.push(`${path}: Card id "${card.id}" is used more than once (also in ${seen}). Every Card id must be unique.`);
      else firstSeenIn.set(card.id, path);
    }
  }
}

function packIdFromPath(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path;
  return name.replace(/\.ya?ml$/i, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** An id-friendly form of a Dutch word: "dank je wel" → "dank-je-wel", "één" → "een". */
function slugOf(dutch: string): string {
  return dutch
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
