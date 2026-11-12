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

export const ARTICLES = ['de', 'het'] as const;

export type Article = (typeof ARTICLES)[number];

export type Card = {
  id: string;
  dutch: string;
  english: string[];
  pos: PartOfSpeech;
  /** Present exactly when pos is "noun". */
  article?: Article;
};

export type Pack = {
  /** Taken from the Pack's file name, e.g. content/packs/food.yaml → "food". */
  id: string;
  title: string;
  cards: Card[];
};
