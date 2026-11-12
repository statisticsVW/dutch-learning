import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { checkContent, checkDictionary, formatErrors } from '../src/content/check.ts';
import { DICTIONARY_PATH, PACKS_DIR, SNAPSHOT_PATH, readArticleSnapshot, readDictionaryFile, readPackFiles } from './read-content.ts';

const PACKS_ID = 'virtual:packs';
const DICTIONARY_ID = 'virtual:dictionary';
const resolved = (id: string) => '\0' + id;

/**
 * Exposes the checked Packs to the app as `import packs from 'virtual:packs'`, and the checked
 * Dictionary as `import('virtual:dictionary')` (imported lazily, so it is its own file in the build).
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
      return id === PACKS_ID || id === DICTIONARY_ID ? resolved(id) : undefined;
    },
    configureServer(server) {
      // In dev, re-run the check and reload the page whenever a Pack file, the Dictionary or the article snapshot changes.
      const packsDir = resolve(root, PACKS_DIR);
      const files = [resolve(root, SNAPSHOT_PATH), resolve(root, DICTIONARY_PATH)];
      server.watcher.add([packsDir, ...files]);
      const onChange = (file: string) => {
        const changed = resolve(file);
        if (!changed.startsWith(packsDir) && !files.includes(changed)) return;
        for (const id of [PACKS_ID, DICTIONARY_ID]) {
          const mod = server.moduleGraph.getModuleById(resolved(id));
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);
    },
    load(id) {
      if (id !== resolved(PACKS_ID) && id !== resolved(DICTIONARY_ID)) return undefined;
      const wiktionary = readArticleSnapshot(root);
      const result = checkContent(readPackFiles(root), wiktionary);
      if (!result.ok) this.error(formatErrors(result.errors));
      if (id === resolved(PACKS_ID)) return `export default ${JSON.stringify(result.packs)};`;

      const dictionary = checkDictionary(readDictionaryFile(root), wiktionary, result.packs);
      if (!dictionary.ok) this.error(formatErrors(dictionary.errors));
      return `export default ${JSON.stringify(dictionary.entries)};`;
    },
  };
}
