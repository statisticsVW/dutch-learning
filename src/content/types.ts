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
  /** A Cognate: an English speaker can already guess it (appel = apple). */
  cognate?: true;
  /** A False friend: it looks like an English word but means something else (brutaal looks like "brutal", but means cheeky). */
  falseFriend?: { looksLike: string };
  fact?: Fact;
};

export type Pack = {
  /** Taken from the Pack's file name, e.g. content/packs/food.yaml → "food". */
  id: string;
  title: string;
  facts?: Fact[];
  cards: Card[];
};

/** A Card's optional notes: its Cognate or False-friend flag and its Fact. */
export type CardNotes = Pick<Card, 'cognate' | 'falseFriend' | 'fact'>;

/** A short "did you know" note about the Dutch language or culture, attached to a Card or Pack. */
export type Fact = { text: string; about: FactPlace };

/** Where a Fact is attached, by the stable Card or Pack id, so the app (and a Mistake report) can point at it. */
export type FactPlace = { kind: 'card' | 'pack'; id: string };

/** Facts are short notes: anything longer is a lesson, not a Fact. */
export const MAX_FACT_LENGTH = 200;

/** A word in the bundled Dictionary. It has the same fields as a Card, but only becomes one when the Learner adds it to Mijn woorden. */
export type DictionaryEntry = Card;

/** The id of Mijn woorden, the Learner's own Pack of words he added from the Dictionary. No Pack file may use it. */
export const MY_WORDS_PACK_ID = 'mijn-woorden';
