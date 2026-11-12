// Run with `npm run snapshot:wiktionary`. (Re)builds content/wiktionary/articles.json: the article
// (de/het) English Wiktionary gives every Dutch noun, read from its noun gender categories.
// The content check compares each noun Card against this file, so it never needs the network.
//
// Wiktionary content is licensed CC BY-SA 4.0; see content/wiktionary/README.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Article } from '../src/content/types.ts';
import { SNAPSHOT_PATH } from './read-pack-files.ts';

const API = 'https://en.wiktionary.org/w/api.php';
const USER_AGENT = 'dutch-learning-content-snapshot/1.0 (build script; Node fetch)';

// Masculine, feminine and common-gender nouns take "de"; neuter nouns take "het".
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
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmnamespace: '0',
      cmprop: 'title',
      cmlimit: '500',
      maxlag: '5',
      ...next,
    });
    const response = await politeFetch(`${API}?${params}`);
    const body = (await response.json()) as {
      error?: { info: string };
      continue?: Record<string, string>;
      query?: { categorymembers: { title: string }[] };
    };
    if (body.error) throw new Error(`Wiktionary error for ${category}: ${body.error.info}`);
    titles.push(...(body.query?.categorymembers ?? []).map((m) => m.title));
    if (!body.continue) return titles;
    next = body.continue;
    await sleep(1000); // be gentle with the API
  }
}

/** Fetches one API page, waiting and retrying when Wiktionary says it is busy (429/503). */
async function politeFetch(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT } });
    if (response.ok) return response;
    if ((response.status !== 429 && response.status !== 503) || attempt === 6) {
      throw new Error(`Wiktionary answered ${response.status} ${response.statusText}`);
    }
    const waitSeconds = Number(response.headers.get('retry-after')) || 5 * 2 ** attempt;
    console.log(`Wiktionary is busy (${response.status}); waiting ${waitSeconds}s before trying again.`);
    await sleep(waitSeconds * 1000);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const articles = new Map<string, Set<Article>>();
for (const [category, article] of Object.entries(CATEGORIES)) {
  const titles = await categoryMembers(category);
  console.log(`${category}: ${titles.length} nouns → ${article}`);
  for (const title of titles) {
    if (!articles.has(title)) articles.set(title, new Set());
    articles.get(title)!.add(article);
  }
}

// One noun per line, sorted, so a rebuild shows up as a readable diff.
const words = [...articles.keys()].sort();
const lines = words.map((word) => `    ${JSON.stringify(word)}: ${JSON.stringify(['de', 'het'].filter((a) => articles.get(word)!.has(a as Article)))}`);
const header = {
  about: 'The article (de/het) English Wiktionary gives each Dutch noun. Rebuild with `npm run snapshot:wiktionary`.',
  source: `English Wiktionary (https://en.wiktionary.org), categories: ${Object.keys(CATEGORIES).join(', ')}`,
  licence: 'CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/ (Wiktionary contributors)',
  retrieved: new Date().toISOString().slice(0, 10),
};
const headerLines = Object.entries(header).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
const text = `{\n${headerLines.join('\n')}\n  "articles": {\n${lines.join(',\n')}\n  }\n}\n`;

mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
writeFileSync(SNAPSHOT_PATH, text);
console.log(`Wrote ${words.length} nouns to ${SNAPSHOT_PATH}.`);
