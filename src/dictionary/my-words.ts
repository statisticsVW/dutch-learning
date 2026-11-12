// Mijn woorden: the Learner's own Pack, made of the Dictionary entries he added.
// Pure: the list is kept on the device by the Mijn woorden store.
import { MY_WORDS_PACK_ID, type DictionaryEntry, type Pack } from '../content/types';

export { MY_WORDS_PACK_ID };

/** Adds an entry at the end; adding a word that is already there changes nothing. */
export function addWord(words: DictionaryEntry[], entry: DictionaryEntry): DictionaryEntry[] {
  return words.some((w) => w.id === entry.id) ? words : [...words, entry];
}

export function removeWord(words: DictionaryEntry[], id: string): DictionaryEntry[] {
  return words.filter((w) => w.id !== id);
}

/**
 * The words with the Dictionary's latest content for each id, so a Curator's correction reaches
 * Mijn woorden. A word the Dictionary no longer has is kept as it was. Returns `words` itself when
 * nothing changed.
 */
export function refreshWords(words: DictionaryEntry[], dictionary: readonly DictionaryEntry[]): DictionaryEntry[] {
  const latest = new Map(dictionary.map((e) => [e.id, e]));
  const refreshed = words.map((w) => latest.get(w.id) ?? w);
  return refreshed.every((w, i) => JSON.stringify(w) === JSON.stringify(words[i])) ? words : refreshed;
}

/**
 * The Packs with Mijn woorden after them, when it has any words. Its Cards keep their Dictionary
 * ids (unique across all content), so progress on a word survives removing and re-adding it.
 */
export function withMyWords(packs: Pack[], words: DictionaryEntry[]): Pack[] {
  if (words.length === 0) return packs;
  return [...packs, { id: MY_WORDS_PACK_ID, title: 'Mijn woorden', cards: words }];
}

/** The Dutch as shown to the Learner: nouns always carry their article. */
export function dutchWithArticle(entry: DictionaryEntry): string {
  return entry.article ? `${entry.article} ${entry.dutch}` : entry.dutch;
}
