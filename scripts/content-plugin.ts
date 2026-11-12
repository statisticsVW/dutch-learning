import { resolve } from 'node:path';
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
    configureServer(server) {
      // In dev, re-run the check and reload the page whenever a Pack file is added, edited or removed.
      const packsDir = resolve(root, PACKS_DIR);
      server.watcher.add(packsDir);
      const onChange = (file: string) => {
        if (!resolve(file).startsWith(packsDir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const result = checkContent(readPackFiles(root));
      if (!result.ok) {
        this.error(formatErrors(result.errors));
      }
      return `export default ${JSON.stringify(result.packs)};`;
    },
  };
}
