// Reads one English Wiktionary page's wikitext and returns, for each article, the English meanings
// of its current Dutch noun senses. Used by build-article-snapshot.ts for words Wiktionary's
// categories list as both de and het, to tell a real second noun (het appel, "appeal") from a sense
// a learner never needs (het hond, an obsolete unit of area).
import type { Article } from '../src/content/types.ts';

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
