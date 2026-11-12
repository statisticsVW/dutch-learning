import { describe, expect, it } from 'vitest';
import { checkContent } from '../src/content/check.ts';
import { readArticleSnapshot, readPackFiles } from './read-pack-files.ts';

describe('the committed Pack files', () => {
  it('pass the content check', () => {
    const result = checkContent(readPackFiles(), readArticleSnapshot());

    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});
