// Searching the Dictionary by English or Dutch. Pure: no DOM or storage.
import type { DictionaryEntry } from '../content/types';

export const MAX_RESULTS = 20;

/** Words a query may start with that are not part of the word itself: "het boek", "to eat", "a dog". */
const LEADING_WORDS = /^(de|het|een|to|a|an|the)\s+/;

/** How well a field matches; lower is better. */
const EXACT = 0;
const STARTS = 1;
const WORD_STARTS = 2;
const CONTAINS = 3;
/** Shorter queries only match from the start of a word, so "oo" does not find every "boom" and "book". */
const MIN_CONTAINS_LENGTH = 3;

/**
 * The entries matching `query` in Dutch or English, best first: exact matches, then words starting
 * with the query, then phrases with a word starting with it, then words containing it.
 * Capitals, accents and a leading article or "to" are ignored.
 */
export function searchDictionary(entries: readonly DictionaryEntry[], query: string, limit = MAX_RESULTS): DictionaryEntry[] {
  const q = withoutLeadingWord(normalise(query));
  if (!q) return [];

  const ranked: { entry: DictionaryEntry; rank: number }[] = [];
  for (const entry of entries) {
    const fields = [entry.dutch, ...entry.english].map((f) => withoutLeadingWord(normalise(f)));
    const rank = Math.min(...fields.map((f) => rankOf(f, q)));
    if (rank < Infinity) ranked.push({ entry, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.entry.dutch.length - b.entry.dutch.length || a.entry.dutch.localeCompare(b.entry.dutch, 'nl'));
  return ranked.slice(0, limit).map((r) => r.entry);
}

function rankOf(field: string, q: string): number {
  if (field === q) return EXACT;
  if (field.startsWith(q)) return STARTS;
  if (field.split(/[\s-]+/).some((word) => word.startsWith(q))) return WORD_STARTS;
  if (q.length >= MIN_CONTAINS_LENGTH && field.includes(q)) return CONTAINS;
  return Infinity;
}

/** Lower case, without accents (é → e, ü → u) and with single spaces. */
function normalise(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();
}

function withoutLeadingWord(text: string): string {
  return text.replace(LEADING_WORDS, '');
}
