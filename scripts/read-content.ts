import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArticleSnapshot, PackFile } from '../src/content/check.ts';

export const PACKS_DIR = 'content/packs';
export const SNAPSHOT_PATH = 'content/wiktionary/articles.json';

/** Reads every Pack file (*.yaml / *.yml) under content/packs, in file-name order. */
export function readPackFiles(root = process.cwd()): PackFile[] {
  return readdirSync(join(root, PACKS_DIR))
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort()
    .map((name) => {
      const path = `${PACKS_DIR}/${name}`;
      return { path, text: readFileSync(join(root, path), 'utf8') };
    });
}

/** Reads the committed Wiktionary article snapshot (built by `npm run snapshot:wiktionary`). */
export function readArticleSnapshot(root = process.cwd()): ArticleSnapshot {
  const { articles } = JSON.parse(readFileSync(join(root, SNAPSHOT_PATH), 'utf8')) as { articles: ArticleSnapshot };
  return articles;
}
