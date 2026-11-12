/**
 * Vite plugin that emits `sw.js`: a service worker that precaches every file of the build
 * (bundle plus `public/`) so the app opens offline after a first visit.
 * The cache name is a hash of all file contents, so each deploy installs a fresh cache and drops the old one.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

const SW_FILE = 'sw.js';

export function serviceWorker(): Plugin {
  let publicDir = '';
  return {
    name: 'service-worker',
    apply: 'build',
    // Run after Vite has added index.html to the bundle.
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const files = new Map<string, string | Uint8Array>();
      for (const path of publicDir ? listFiles(publicDir) : []) {
        files.set(relative(publicDir, path).split(sep).join('/'), readFileSync(path));
      }
      for (const item of Object.values(bundle)) {
        files.set(item.fileName, item.type === 'chunk' ? item.code : item.source);
      }
      files.delete(SW_FILE);
      this.emitFile({ type: 'asset', fileName: SW_FILE, source: serviceWorkerSource(files) });
    },
  };
}

function listFiles(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/** The service worker script for a build made of `files` (path relative to the site root → contents). */
export function serviceWorkerSource(files: Map<string, string | Uint8Array>): string {
  const paths = [...files.keys()].sort();
  const hash = createHash('sha256');
  for (const path of paths) hash.update(path).update('\0').update(files.get(path)!).update('\0');
  const cacheName = `dutch-${hash.digest('hex').slice(0, 16)}`;
  const precache = paths.map((path) => `./${path}`);

  return `// Generated at build time by pwa/service-worker.ts.
const CACHE = ${JSON.stringify(cacheName)};
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Bypass the HTTP cache so a stale index.html can't point at assets from another deploy.
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('dutch-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// The cache holds exactly one build, so a URL match is enough. Ignoring Vary matters: servers may send
// "Vary: Origin", and module scripts are requested with an Origin header the precache requests lacked.
const MATCH = { cacheName: CACHE, ignoreVary: true };

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  // Every page of the app is the same single-page shell.
  const cached = request.mode === 'navigate' ? caches.match('./index.html', MATCH) : caches.match(request, MATCH);
  event.respondWith(cached.then((response) => response || fetch(request)));
});
`;
}
