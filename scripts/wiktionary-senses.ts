// Reads one English Wiktionary page's wikitext and returns, for each article, the English meanings
// of its current Dutch noun senses. Used by build-article-snapshot.ts for words Wiktionary's
// categories list as both de and het, to tell a real second noun (het appel, "appeal") from a sense
// a learner never needs (het hond, an obsolete unit of area).
import type { Article, PartOfSpeech } from '../src/content/types.ts';

/** Senses with these labels don't count: they're not current Netherlands Dutch. */
const SKIPPED_LABELS = /\{\{(?:lb|lbl|label)\|nl\|[^}]*\b(?:obsolete|archaic|dated|Belgium|Flemish|Flanders|Suriname|dialectal|regional)\b/i;

const GENDER_ARTICLE: Record<string, Article> = { m: 'de', f: 'de', c: 'de', n: 'het' };

export function nounMeaningsByArticle(wikitext: string): Record<Article, string[]> {
  const meanings: Record<Article, string[]> = { de: [], het: [] };
  let articles: Article[] = []; // of the noun heading we are under, if any
  for (const line of dutchSection(wikitext).split('\n')) {
    if (/^=+[^=]+=+\s*$/.test(line)) {
      articles = [];
      continue;
    }
    const head = /^\{\{nl-noun\|([^|}]*)/.exec(line);
    if (head) {
      articles = [...new Set(head[1].split(',').map((g) => GENDER_ARTICLE[g.trim()]).filter((a) => a !== undefined))];
      continue;
    }
    if (articles.length === 0 || !/^#+ /.test(line) || SKIPPED_LABELS.test(line)) continue;
    const meaning = plainText(line.replace(/^#+ /, ''));
    if (meaning) articles.forEach((a) => meanings[a].push(meaning));
  }
  return meanings;
}

/** Senses a young Learner's Dictionary should not show. */
const UNSUITABLE_LABELS = /\{\{(?:lb|lbl|label)\|nl\|[^}]*\b(?:vulgar|offensive|derogatory|pejorative|slur|sexual|euphemistic)\b/i;

/** Senses that only point at another word: plurals, verb forms, spellings. */
const FORM_OF = /\{\{(?:[^|}]*form of|infl of|inflection of|plural of|[^|}]*participle of|diminutive of|abbreviation of|alt form|alternative spelling of|misspelling of|clipping of|short for|nl-[^|}]*)\|/;

/** Wiktionary part-of-speech headings → our parts of speech. */
const POS_OF_HEADING: Record<string, PartOfSpeech> = {
  Noun: 'noun',
  Verb: 'verb',
  Adjective: 'adjective',
  Adverb: 'adverb',
  Pronoun: 'pronoun',
  Determiner: 'pronoun',
  Preposition: 'preposition',
  Postposition: 'preposition',
  Conjunction: 'conjunction',
  Numeral: 'numeral',
  Interjection: 'interjection',
};

/** One current Dutch sense: its English, and for a noun the article(s) of the noun it belongs to. */
export type DutchSense = { articles: Article[]; text: string };
export type DutchSenses = Partial<Record<PartOfSpeech, DutchSense[]>>;

/**
 * The current Dutch senses on one English Wiktionary page, by part of speech, in page order.
 * Drops obsolete, regional and form-of senses ("plural of …"), and senses unsuitable for a young
 * Learner; a part of speech whose first sense is unsuitable is dropped altogether.
 */
export function dutchSenses(wikitext: string): DutchSenses {
  const senses: DutchSenses = {};
  const unsuitable = new Set<PartOfSpeech>();
  let pos: PartOfSpeech | undefined;
  let articles: Article[] = [];
  for (const line of dutchSection(wikitext).split('\n')) {
    const heading = /^=+\s*([^=]+?)\s*=+\s*$/.exec(line);
    if (heading) {
      pos = POS_OF_HEADING[heading[1]];
      articles = [];
      continue;
    }
    if (!pos) continue;
    const head = /^\{\{nl-noun\|([^|}]*)/.exec(line);
    if (head) {
      articles = [...new Set(head[1].split(',').map((g) => GENDER_ARTICLE[g.trim()]).filter((a) => a !== undefined))];
      continue;
    }
    if (!/^# /.test(line) || SKIPPED_LABELS.test(line) || FORM_OF.test(line)) continue;
    const list = (senses[pos] ??= []);
    if (UNSUITABLE_LABELS.test(line)) {
      if (list.length === 0) unsuitable.add(pos);
      continue;
    }
    const text = plainText(line.replace(/^# /, ''));
    if (text) list.push({ articles: pos === 'noun' ? articles : [], text });
  }
  for (const key of Object.keys(senses) as PartOfSpeech[]) {
    if (unsuitable.has(key) || senses[key]!.length === 0) delete senses[key];
  }
  return senses;
}

function dutchSection(wikitext: string): string {
  const start = wikitext.search(/^==\s*Dutch\s*==\s*$/m);
  if (start < 0) return '';
  const rest = wikitext.slice(start).replace(/^==\s*Dutch\s*==\s*$/m, '');
  const end = rest.search(/^==[^=].*==\s*$/m);
  return end < 0 ? rest : rest.slice(0, end);
}

/** Wikitext → readable text: keeps link text and glosses, drops other templates. */
function plainText(wikitext: string): string {
  // Resolve templates innermost first: links keep their text, glosses go in brackets, the rest goes.
  let text = wikitext;
  for (let previous = ''; previous !== text; ) {
    previous = text;
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_, inner: string) => {
      const [name, ...args] = inner.split('|');
      if (['l', 'll', 'm'].includes(name)) return args[1] ?? '';
      if (name === 'w') return args[0] ?? '';
      if (['gloss', 'gl', 'n-g', 'ng', 'non-gloss'].includes(name)) return `(${args.join('|')})`;
      return '';
    });
  }
  return text
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\(\s*[,;]\s*/g, '(')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
