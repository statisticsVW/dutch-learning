// Reads NT2Lex (sources/nt2lex/, CC BY-NC-SA 4.0): how often each Dutch word appears in reading
// texts for learners at each CEFR level. Used by build-dictionary.ts to pick the Dictionary's words.
import type { PartOfSpeech } from '../src/content/types.ts';

export type Nt2LexWord = {
  word: string;
  pos: PartOfSpeech;
  /** The first level whose texts use the word. */
  level: 'A1' | 'A2';
  /** Uses per million words, across all levels. */
  frequency: number;
};

/** NT2Lex's (simplified CGN) tag → our part of speech. Tags not listed (articles, names, foreign words) are skipped. */
const POS_OF_TAG: Record<string, PartOfSpeech> = {
  N: 'noun',
  WW: 'verb',
  ADJ: 'adjective',
  BW: 'adverb',
  VNW: 'pronoun',
  VZ: 'preposition',
  VG: 'conjunction',
  TW: 'numeral',
  TSW: 'interjection',
};

/** The single words NT2Lex finds at A1 or A2, one per word and part of speech, most frequent first. */
export function readNt2Lex(tsv: string): Nt2LexWord[] {
  const [header, ...lines] = tsv.split(/\r?\n/).filter((line) => line.trim() !== '');
  const columns = header.split('\t');
  const column = (name: string) => {
    const index = columns.indexOf(name);
    if (index < 0) throw new Error(`NT2Lex has no "${name}" column.`);
    return index;
  };
  const [word, tag, a1, a2, total] = ['word', 'tag', 'U@A1', 'U@A2', 'U@TOTAL'].map(column);

  const found = new Map<string, Nt2LexWord>();
  for (const line of lines) {
    const cells = line.split('\t');
    const pos = posOf(cells[tag]);
    const level = cells[a1] !== '-' ? 'A1' : cells[a2] !== '-' ? 'A2' : undefined;
    if (!pos || !level || !/^\p{Ll}[\p{Ll}\p{M}-]*$/u.test(cells[word])) continue;
    const key = wordKey(cells[word], pos);
    const frequency = Number(cells[total]) || 0;
    const seen = found.get(key);
    if (!seen) found.set(key, { word: cells[word], pos, level, frequency });
    else {
      seen.frequency += frequency;
      if (level === 'A1') seen.level = 'A1';
    }
  }
  return [...found.values()].sort((a, b) => b.frequency - a.frequency || a.word.localeCompare(b.word, 'nl'));
}

/** One key per word and part of speech: "eten" the verb and "eten" the noun are different words. */
export function wordKey(word: string, pos: PartOfSpeech): string {
  return `${word.toLowerCase()}|${pos}`;
}

/** "N(soort)" → noun; proper names ("N(eigen)") and multi-word tags → undefined. */
function posOf(tag: string): PartOfSpeech | undefined {
  const match = /^([A-Z]+)\(([^)]*)\)$/.exec(tag);
  if (!match || (match[1] === 'N' && match[2] !== 'soort')) return undefined;
  return POS_OF_TAG[match[1]];
}
