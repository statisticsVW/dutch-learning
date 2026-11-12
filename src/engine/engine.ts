// The learning engine: pure TypeScript, no DOM, storage or audio.
// One engine is one Burst: created from the content, the Learner's saved progress and a clock.
import { createEmptyCard, fsrs, Rating, type Card as FsrsCard, type State } from 'ts-fsrs';
import type { Card, CardNotes, Fact, Pack } from '../content/types';
import type { Clock } from '../adapters/clock';

export const NEW_CARDS_PER_GROUP = 5;
export const MAX_NEW_CARDS_PER_BURST = 15;
const OPTIONS_PER_PROMPT = 4;
/** A rough pace for the review-time estimate: one prompt plus its feedback. */
export const REVIEW_SECONDS_PER_CARD = 10;
/** A gap since the last Burst of at least this long earns a welcome back. */
export const WELCOME_BACK_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** What the engine remembers about one Card. Stored as JSON, keyed by Card id. */
export type CardProgress = {
  due: string;
  lastCorrect: boolean;
  /** Scheduler memory (FSRS). Opaque to everything outside the engine. */
  memory: { stability: number; difficulty: number; scheduledDays: number; learningSteps: number; reps: number; lapses: number; state: number; lastReview?: string };
};

export type Progress = { version: 1; cards: Record<string, CardProgress> };

export function emptyProgress(): Progress {
  return { version: 1, cards: {} };
}

export type Prompt = { kind: 'prompt'; cardId: string; mode: 'recognise'; dutch: string; options: string[]; /** The Card's Cognate / False-friend flag and Fact, when it has any. */ notes?: CardNotes };
export type GroupDone = { kind: 'group-done'; canDoMore: boolean; /** After new Cards: one of the Pack's Facts, when it has any. */ fact?: Fact };
export type AnswerResult = { verdict: 'correct' | 'wrong'; correctAnswer: string; progress: Progress };
export type PackSummary = { id: string; title: string; learned: number; total: number };
/** Cards due for review, and roughly how many minutes reviewing them all takes. */
export type FadingSummary = { count: number; minutes: number };
export type Overview = { wordsKnown: number; fading: FadingSummary; welcomeBack: boolean; packs: PackSummary[] };

export type Engine = {
  overview(): Overview;
  /** Starts a group of up to five new Cards from a Pack ("more" calls this again). */
  startNewCards(packId: string): void;
  /** Starts reviewing every fading Card, most useful first. Optional: the Learner can skip it. */
  startReview(): void;
  nextPrompt(): Prompt | GroupDone;
  /** Answers the current prompt with the chosen option. */
  answer(option: string): AnswerResult;
  progress(): Progress;
};

export type EngineDeps = { packs: Pack[]; progress: Progress; clock: Clock; random?: () => number };

const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false, enable_short_term: false });

export function createEngine({ packs, progress: saved, clock, random = Math.random }: EngineDeps): Engine {
  const progress: Progress = structuredClone(saved);
  const allCards = packs.flatMap((p) => p.cards);
  /** New Cards answered for the first time in this Burst (counts toward the cap). */
  let introducedThisBurst = 0;
  /** The Pack new Cards come from; undefined while reviewing (a review offers no "more"). */
  let newCardsPackId: string | undefined;
  let queue: Card[] = [];
  let current: Prompt | undefined;
  // Decided once, when the Burst starts: answering during this Burst doesn't take it away.
  const welcomeBack = gapSinceLastBurst(progress, clock.now()) >= WELCOME_BACK_AFTER_DAYS * DAY_MS;

  const findPack = (id: string) => {
    const pack = packs.find((p) => p.id === id);
    if (!pack) throw new Error(`Unknown Pack: ${id}`);
    return pack;
  };
  const isLearned = (card: Card) => progress.cards[card.id]?.lastCorrect === true;
  const unseen = (pack: Pack) => pack.cards.filter((c) => !progress.cards[c.id]);
  const fadingCards = () => {
    const now = clock.now().getTime();
    return allCards.filter((c) => {
      const saved = progress.cards[c.id];
      return saved !== undefined && new Date(saved.due).getTime() <= now;
    });
  };
  const canDoMore = () => newCardsPackId !== undefined && introducedThisBurst < MAX_NEW_CARDS_PER_BURST && unseen(findPack(newCardsPackId)).length > 0;

  function buildPrompt(card: Card): Prompt {
    const answer = meaningOf(card);
    const pack = packs.find((p) => p.cards.includes(card))!;
    const others = (cards: Card[]) => shuffle(unique(cards.map(meaningOf).filter((e) => e !== answer)), random);
    const fromPack = others(pack.cards);
    const fromElsewhere = others(allCards).filter((e) => !fromPack.includes(e));
    const distractors = [...fromPack, ...fromElsewhere].slice(0, OPTIONS_PER_PROMPT - 1);
    return {
      kind: 'prompt',
      cardId: card.id,
      mode: 'recognise',
      dutch: displayDutch(card),
      options: shuffle([answer, ...distractors], random),
      ...notesOf(card),
    };
  }

  /** One of the Pack's Facts, a different one after each group of five new Cards. */
  function packFact(): Pick<GroupDone, 'fact'> {
    const pack = newCardsPackId === undefined ? undefined : findPack(newCardsPackId);
    if (!pack?.facts?.length) return {};
    const groupsSeen = Math.ceil((pack.cards.length - unseen(pack).length) / NEW_CARDS_PER_GROUP);
    return { fact: pack.facts[Math.max(0, groupsSeen - 1) % pack.facts.length] };
  }

  return {
    overview() {
      const summaries = packs.map((p) => ({ id: p.id, title: p.title, learned: p.cards.filter(isLearned).length, total: p.cards.length }));
      const count = fadingCards().length;
      const fading = { count, minutes: Math.ceil((count * REVIEW_SECONDS_PER_CARD) / 60) };
      return { wordsKnown: allCards.filter(isLearned).length, fading, welcomeBack, packs: summaries };
    },

    startNewCards(id) {
      const pack = findPack(id);
      newCardsPackId = id;
      const room = Math.min(NEW_CARDS_PER_GROUP, MAX_NEW_CARDS_PER_BURST - introducedThisBurst);
      // Cards left unanswered by a stopped group are still unseen, so they come first again.
      queue = unseen(pack).slice(0, Math.max(0, room));
      current = undefined;
    },

    startReview() {
      newCardsPackId = undefined;
      const now = clock.now().getTime();
      queue = fadingCards().sort((a, b) => usefulness(progress.cards[b.id], now) - usefulness(progress.cards[a.id], now));
      current = undefined;
    },

    nextPrompt() {
      if (queue.length === 0) return { kind: 'group-done', canDoMore: canDoMore(), ...packFact() };
      current ??= buildPrompt(queue[0]);
      return current;
    },

    answer(option) {
      const card = queue.shift();
      if (!card) throw new Error('There is no prompt to answer.');
      current = undefined;
      const correctAnswer = meaningOf(card);
      const correct = option === correctAnswer;
      const now = clock.now();
      const before = progress.cards[card.id];
      if (!before) introducedThisBurst++;
      const scheduled = scheduler.next(before ? toFsrs(before) : createEmptyCard(now), now, correct ? Rating.Good : Rating.Again).card;
      progress.cards[card.id] = fromFsrs(scheduled, correct);
      if (!correct) queue.push(card);
      return { verdict: correct ? 'correct' : 'wrong', correctAnswer, progress: structuredClone(progress) };
    },

    progress: () => structuredClone(progress),
  };
}

/**
 * How useful reviewing a Card is now: how far past due it is, relative to how well it was known.
 * A weak Card a little overdue is closer to being forgotten than a strong Card long overdue.
 */
function usefulness({ due, memory }: CardProgress, now: number): number {
  return (now - new Date(due).getTime()) / DAY_MS / Math.max(memory.stability, 0.01);
}

/** Time since the latest answer in any earlier Burst, or 0 when there has never been one. */
function gapSinceLastBurst(progress: Progress, now: Date): number {
  const answered = Object.values(progress.cards).flatMap((c) => (c.memory.lastReview ? [new Date(c.memory.lastReview).getTime()] : []));
  return answered.length === 0 ? 0 : now.getTime() - Math.max(...answered);
}

function toFsrs({ due, memory: m }: CardProgress): FsrsCard {
  return {
    due: new Date(due),
    stability: m.stability,
    difficulty: m.difficulty,
    scheduled_days: m.scheduledDays,
    learning_steps: m.learningSteps,
    reps: m.reps,
    lapses: m.lapses,
    state: m.state as State,
    last_review: m.lastReview ? new Date(m.lastReview) : undefined,
  };
}

function fromFsrs(card: FsrsCard, lastCorrect: boolean): CardProgress {
  const memory: CardProgress['memory'] = {
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
  };
  if (card.last_review) memory.lastReview = new Date(card.last_review).toISOString();
  return { due: new Date(card.due).toISOString(), lastCorrect, memory };
}

/** The meaning a recognise prompt asks for: the Card's first English meaning. */
function meaningOf(card: Card): string {
  return card.english[0];
}

/** The Card's notes for its prompt, or nothing when it has none. */
function notesOf({ cognate, falseFriend, fact }: Card): { notes?: CardNotes } {
  const notes: CardNotes = { ...(cognate && { cognate }), ...(falseFriend && { falseFriend }), ...(fact && { fact }) };
  return Object.keys(notes).length > 0 ? { notes } : {};
}

/** The Dutch as shown to the Learner: nouns always carry their article. */
function displayDutch(card: Card): string {
  return card.article ? `${card.article} ${card.dutch}` : card.dutch;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
