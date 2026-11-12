// The learning engine: pure TypeScript, no DOM, storage or audio.
// One engine is one Burst: created from the content, the Learner's saved progress and a clock.
import { createEmptyCard, fsrs, Rating, type Card as FsrsCard, type State } from 'ts-fsrs';
import type { Card, Pack } from '../content/types';
import type { Clock } from '../adapters/clock';

export const NEW_CARDS_PER_GROUP = 5;
export const MAX_NEW_CARDS_PER_BURST = 15;
const OPTIONS_PER_PROMPT = 4;

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

export type Prompt = { kind: 'prompt'; cardId: string; mode: 'recognise'; dutch: string; options: string[] };
export type GroupDone = { kind: 'group-done'; canDoMore: boolean };
export type AnswerResult = { verdict: 'correct' | 'wrong'; correctAnswer: string; progress: Progress };
export type PackSummary = { id: string; title: string; learned: number; total: number };
export type Overview = { wordsKnown: number; packs: PackSummary[] };

export type Engine = {
  overview(): Overview;
  /** Starts a group of up to five new Cards from a Pack ("more" calls this again). */
  startNewCards(packId: string): void;
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
  let packId: string | undefined;
  let queue: Card[] = [];
  let current: Prompt | undefined;

  const findPack = (id: string) => {
    const pack = packs.find((p) => p.id === id);
    if (!pack) throw new Error(`Unknown Pack: ${id}`);
    return pack;
  };
  const isLearned = (card: Card) => progress.cards[card.id]?.lastCorrect === true;
  const unseen = (pack: Pack) => pack.cards.filter((c) => !progress.cards[c.id]);
  const canDoMore = () => packId !== undefined && introducedThisBurst < MAX_NEW_CARDS_PER_BURST && unseen(findPack(packId)).length > 0;

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
    };
  }

  return {
    overview() {
      const summaries = packs.map((p) => ({ id: p.id, title: p.title, learned: p.cards.filter(isLearned).length, total: p.cards.length }));
      return { wordsKnown: allCards.filter(isLearned).length, packs: summaries };
    },

    startNewCards(id) {
      const pack = findPack(id);
      packId = id;
      const room = Math.min(NEW_CARDS_PER_GROUP, MAX_NEW_CARDS_PER_BURST - introducedThisBurst);
      // Cards left unanswered by a stopped group are still unseen, so they come first again.
      queue = unseen(pack).slice(0, Math.max(0, room));
      current = undefined;
    },

    nextPrompt() {
      if (queue.length === 0) return { kind: 'group-done', canDoMore: canDoMore() };
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
