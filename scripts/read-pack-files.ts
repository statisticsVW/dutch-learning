import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PackFile } from '../src/content/check.ts';

export const PACKS_DIR = 'content/packs';

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
