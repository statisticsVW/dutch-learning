import { describe, expect, it } from 'vitest';
import { serviceWorkerSource } from './service-worker.ts';

const build = (files: Record<string, string>) => serviceWorkerSource(new Map(Object.entries(files)));

describe('serviceWorkerSource', () => {
  it('precaches every built file so the app loads offline after a first visit', () => {
    const source = build({ 'index.html': '<html>', 'assets/index-abc.js': 'js', 'icons/icon-192.png': 'png' });

    expect(source).toContain('"./index.html"');
    expect(source).toContain('"./assets/index-abc.js"');
    expect(source).toContain('"./icons/icon-192.png"');
  });

  it('gets a new cache version whenever any file changes, so updates reach the Learner', () => {
    const cacheName = (source: string) => source.match(/const CACHE = "([^"]+)"/)?.[1];
    const before = build({ 'index.html': '<html>', 'assets/index.js': 'one' });
    const after = build({ 'index.html': '<html>', 'assets/index.js': 'two' });

    expect(cacheName(before)).toBeTruthy();
    expect(cacheName(after)).not.toBe(cacheName(before));
    expect(cacheName(build({ 'index.html': '<html>', 'assets/index.js': 'one' }))).toBe(cacheName(before));
  });
});
