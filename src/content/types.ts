export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'numeral',
  'interjection',
  'phrase',
] as const;

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

export type Card = {
  id: string;
  dutch: string;
  english: string[];
  pos: PartOfSpeech;
  article?: string;
};

export type Pack = {
  /** Taken from the Pack's file name, e.g. content/packs/food.yaml → "food". */
  id: string;
  title: string;
  cards: Card[];
};
