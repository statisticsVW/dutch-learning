// Run with `npm run snapshot:wiktionary`. (Re)builds content/wiktionary/articles.json: the article
// (de/het) English Wiktionary gives every Dutch noun. The content check compares each noun Card
// against this file, so it never needs the network.
//
// 1. Read Wiktionary's Dutch noun gender categories: masculine/feminine/common → de, neuter → het.
// 2. A word in both groups is often two different nouns (de appel "apple", het appel "appeal") or has
//    an obsolete second sense (het hond, a unit of area). For those, read the page itself: drop
//    obsolete, archaic and regional senses, and keep each article's English meanings so the check
//    can tell which noun a Card means.
//
// Wiktionary content is licensed CC BY-SA 4.0; see content/wiktionary/README.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ArticleSnapshot } from '../src/content/check.ts';
import { ARTICLES, type Article } from '../src/content/types.ts';
import { SNAPSHOT_PATH } from './read-content.ts';
import { nounMeaningsByArticle } from './wiktionary-senses.ts';
import { api, pageTexts } from './wiktionary-api.ts';

const CATEGORIES: Record<string, Article> = {
  'Dutch masculine nouns': 'de',
  'Dutch feminine nouns': 'de',
  'Dutch common-gender nouns': 'de',
  'Dutch neuter nouns': 'het',
};

async function categoryMembers(category: string): Promise<string[]> {
  const titles: string[] = [];
  let next: Record<string, string> = {};
  for (;;) {
    const body = await api({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmnamespace: '0',
      cmprop: 'title',
      cmlimit: '500',
      ...next,
    });
    titles.push(...(body.query?.categorymembers ?? []).map((m) => m.title));
    if (!body.continue) return titles;
    next = body.continue;
  }
}

// Step 1: categories.
const found = new Map<string, Set<Article>>();
for (const [category, article] of Object.entries(CATEGORIES)) {
  const titles = await categoryMembers(category);
  console.log(`${category}: ${titles.length} nouns → ${article}`);
  for (const title of titles) {
    if (!found.has(title)) found.set(title, new Set());
    found.get(title)!.add(article);
  }
}

// Step 2: words with both articles.
const snapshot: Record<string, ArticleSnapshot[string]> = {};
const both = [...found].filter(([, articles]) => articles.size > 1).map(([word]) => word);
const texts = await pageTexts(both, 'pages with both articles');
for (const [word, articles] of found) {
  snapshot[word] = ARTICLES.filter((a) => articles.has(a));
  const text = texts.get(word);
  if (articles.size < 2 || !text) continue;
  const meanings = nounMeaningsByArticle(text);
  const current = ARTICLES.filter((a) => meanings[a].length > 0);
  if (current.length === 1) snapshot[word] = current;
  else if (current.length === 2) snapshot[word] = meanings;
  // No readable senses: keep accepting either article.
}

// One noun per line, sorted, so a rebuild shows up as a readable diff.
const words = Object.keys(snapshot).sort();
const header = {
  about: 'The article (de/het) English Wiktionary gives each Dutch noun; words that are two nouns list each article\'s meanings. Rebuild with `npm run snapshot:wiktionary`.',
  source: `English Wiktionary (https://en.wiktionary.org), categories: ${Object.keys(CATEGORIES).join(', ')}`,
  licence: 'CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/ (Wiktionary contributors)',
  retrieved: new Date().toLocaleDateString('sv-SE'), // YYYY-MM-DD, local time
};
const lines = [
  '{',
  ...Object.entries(header).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`),
  '  "articles": {',
  words.map((word) => `    ${JSON.stringify(word)}: ${JSON.stringify(snapshot[word])}`).join(',\n'),
  '  }',
  '}',
];

mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
writeFileSync(SNAPSHOT_PATH, `${lines.join('\n')}\n`);
const split = words.filter((w) => !Array.isArray(snapshot[w])).length;
const stillBoth = words.filter((w) => Array.isArray(snapshot[w]) && snapshot[w].length > 1).length;
console.log(`Wrote ${words.length} nouns to ${SNAPSHOT_PATH} (${split} checked by meaning, ${stillBoth} accept either article).`);
