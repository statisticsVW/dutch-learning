import { join } from 'node:path';
import type { Plugin } from 'vite';
import { checkContent, formatErrors } from '../src/content/check.ts';
import { PACKS_DIR, readPackFiles } from './read-pack-files.ts';

const VIRTUAL_ID = 'virtual:packs';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Exposes the checked Packs to the app as `import packs from 'virtual:packs'`.
 * If the content check fails, the build fails with the Curator-facing error list.
 */
export function contentPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: 'dutch-learning-content',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      this.addWatchFile(join(root, PACKS_DIR));
      const files = readPackFiles(root);
      files.forEach((f) => this.addWatchFile(join(root, f.path)));
      const result = checkContent(files);
      if (!result.ok) {
        this.error(formatErrors(result.errors));
      }
      return `export default ${JSON.stringify(result.packs)};`;
    },
  };
}
