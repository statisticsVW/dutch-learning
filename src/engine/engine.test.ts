import { describe, expect, it } from 'vitest';
import type { Card, Pack } from '../content/types';
import { createEngine, emptyProgress, FAST_RECALL_SECONDS, RECALL_AFTER_STABILITY_DAYS, REVIEW_SECONDS_PER_CARD, WELCOME_BACK_AFTER_DAYS, type CardProgress, type Engine, type Progress, type Prompt } from './engine';
import { createFakeClock } from '../adapters/clock';

const DAY = 24 * 60 * 60 * 1000;

function card(id: string, dutch: string, english: string, extra: Partial<Card> = {}): Card {
  return { id, dutch, english: [english], pos: 'noun', article: 'de', ...extra };
}

/** A Pack with `count` Cards: big-01 … big-NN, meaning "meaning 1" … */
function bigPack(count: number): Pack {
  const cards = Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return card(`big-${n}`, `woord${n}`, `meaning ${i + 1}`);
  });
  return { id: 'big', title: 'Big', cards };
}

const animals: Pack = {
  id: 'animals',
  title: 'Animals',
  cards: [
    card('animals-01', 'hond', 'dog'),
    card('animals-02', 'kat', 'cat'),
    card('animals-03', 'paard', 'horse', { article: 'het' }),
    card('animals-04', 'vis', 'fish'),
    card('animals-05', 'vogel', 'bird'),
    card('animals-06', 'koe', 'cow'),
  ],
};

function engineWith(
  packs: Pack[],
  progress: Progress = emptyProgress(),
  clock = createFakeClock(new Date('2026-01-01T10:00:00Z')),
  audioAvailable = () => false,
) {
  return { engine: createEngine({ packs, progress, clock, random: () => 0.5, audioAvailable }), clock };
}

function expectPrompt(engine: Engine): Prompt {
  const next = engine.nextPrompt();
  if (next.kind !== 'prompt') throw new Error(`expected a prompt, got ${next.kind}`);
  return next;
}

/** The right answer: the meaning to pick, or the Dutch to type for recall. */
function correctOption(packs: Pack[], prompt: Prompt): string {
  if (prompt.mode === 'recall') return prompt.dutch;
  const c = packs.flatMap((p) => p.cards).find((x) => x.id === prompt.cardId)!;
  return c.english[0];
}

function wrongOption(packs: Pack[], prompt: Prompt): string {
  return prompt.options.find((o) => o !== correctOption(packs, prompt))!;
}

/** Answers every prompt in the current group correctly; returns the Card ids asked. */
function answerGroup(engine: Engine, packs: Pack[]): string[] {
  const asked: string[] = [];
  for (let next = engine.nextPrompt(); next.kind === 'prompt'; next = engine.nextPrompt()) {
    asked.push(next.cardId);
    engine.answer(correctOption(packs, next));
  }
  return asked;
}

describe('new Cards come in groups of five', () => {
  it('introduces the first five unseen Cards of the chosen Pack, then offers more', () => {
    const packs = [bigPack(20)];
    const { engine } = engineWith(packs);

    engine.startNewCards('big');
    const asked = answerGroup(engine, packs);

    expect(asked).toEqual(['big-01', 'big-02', 'big-03', 'big-04', 'big-05']);
    expect(engine.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: true });
  });

  it('"more" brings the next five Cards, and stops offering more after fifteen in one Burst', () => {
    const packs = [bigPack(20)];
    const { engine } = engineWith(packs);

    const groups: string[][] = [];
    for (let i = 0; i < 3; i++) {
      engine.startNewCards('big');
      groups.push(answerGroup(engine, packs));
    }

    expect(groups.map((g) => g.length)).toEqual([5, 5, 5]);
    expect(groups[2]).toEqual(['big-11', 'big-12', 'big-13', 'big-14', 'big-15']);
    expect(engine.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: false });
    engine.startNewCards('big');
    expect(engine.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: false });
  });

  it('counts the cap of fifteen across Packs within one Burst', () => {
    const packs = [bigPack(12), animals];
    const { engine } = engineWith(packs);

    engine.startNewCards('big');
    answerGroup(engine, packs);
    engine.startNewCards('big');
    answerGroup(engine, packs);
    engine.startNewCards('animals');

    expect(answerGroup(engine, packs)).toEqual(['animals-01', 'animals-02', 'animals-03', 'animals-04', 'animals-05']);
    expect(engine.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: false });
  });

  it('a new Burst (a new engine) can introduce fifteen more, skipping Cards already met', () => {
    const packs = [bigPack(20)];
    const first = engineWith(packs);
    for (let i = 0; i < 3; i++) {
      first.engine.startNewCards('big');
      answerGroup(first.engine, packs);
    }

    const { engine } = engineWith(packs, first.engine.progress(), first.clock);
    engine.startNewCards('big');

    expect(answerGroup(engine, packs)).toEqual(['big-16', 'big-17', 'big-18', 'big-19', 'big-20']);
    expect(engine.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: false });
  });

  it('stopping mid-group neither skips the unanswered Cards nor counts them toward the cap', () => {
    const packs = [bigPack(20)];
    const { engine } = engineWith(packs);

    engine.startNewCards('big');
    engine.answer('meaning 1');
    engine.answer('meaning 2');
    engine.startNewCards('big'); // the Learner stopped and picked the Pack again

    expect(answerGroup(engine, packs)).toEqual(['big-03', 'big-04', 'big-05', 'big-06', 'big-07']);
    engine.startNewCards('big');
    answerGroup(engine, packs);
    expect(engine.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: true });
    engine.startNewCards('big');
    expect(answerGroup(engine, packs)).toEqual(['big-13', 'big-14', 'big-15']);
    expect(engine.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: false });
  });

  it('offers no more when the Pack has no unseen Cards left', () => {
    const packs = [animals];
    const { engine } = engineWith(packs);

    engine.startNewCards('animals');
    answerGroup(engine, packs);
    engine.startNewCards('animals');

    expect(answerGroup(engine, packs)).toEqual(['animals-06']);
    expect(engine.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: false });
  });
});

describe('a recognise prompt', () => {
  it('shows the Dutch with its article and four distinct English options including the right one', () => {
    const packs = [animals];
    const { engine } = engineWith(packs);

    engine.startNewCards('animals');
    engine.nextPrompt();
    engine.answer('dog');
    engine.nextPrompt();
    engine.answer('cat');
    const prompt = expectPrompt(engine);

    expect(prompt).toMatchObject({ kind: 'prompt', cardId: 'animals-03', mode: 'recognise', dutch: 'het paard' });
    expect(prompt.options).toHaveLength(4);
    expect(new Set(prompt.options).size).toBe(4);
    expect(prompt.options).toContain('horse');
    expect(prompt.options.every((o) => ['dog', 'cat', 'horse', 'fish', 'bird', 'cow'].includes(o))).toBe(true);
  });

  it('shows words without an article as they are', () => {
    const packs: Pack[] = [{ id: 'hello', title: 'Hello', cards: [card('hello-01', 'hallo', 'hello', { pos: 'interjection', article: undefined })] }];
    const { engine } = engineWith(packs);

    engine.startNewCards('hello');

    expect(expectPrompt(engine)).toMatchObject({ dutch: 'hallo', options: ['hello'] });
  });

  it('borrows distractors from other Packs when the chosen Pack is small', () => {
    const tiny: Pack = { id: 'tiny', title: 'Tiny', cards: [card('tiny-01', 'boom', 'tree')] };
    const packs = [tiny, animals];
    const { engine } = engineWith(packs);

    engine.startNewCards('tiny');
    const prompt = expectPrompt(engine);

    expect(prompt.options).toHaveLength(4);
    expect(prompt.options).toContain('tree');
  });
});

describe('answers', () => {
  it('a correct answer is "correct" and schedules the Card days ahead', () => {
    const packs = [animals];
    const { engine, clock } = engineWith(packs);

    engine.startNewCards('animals');
    const result = engine.answer(correctOption(packs, expectPrompt(engine)));

    expect(result.verdict).toBe('correct');
    expect(result.correctAnswer).toBe('dog');
    const due = new Date(result.progress.cards['animals-01'].due).getTime();
    expect(due - clock.now().getTime()).toBeGreaterThanOrEqual(DAY);
  });

  it('a wrong answer is "wrong", shows the right answer, schedules the Card sooner, and asks it again before the group ends', () => {
    const packs = [animals];
    const right = engineWith(packs);
    right.engine.startNewCards('animals');
    const rightDue = right.engine.answer('dog').progress.cards['animals-01'].due;

    const { engine } = engineWith(packs);
    engine.startNewCards('animals');
    const prompt = expectPrompt(engine);
    const result = engine.answer(wrongOption(packs, prompt));

    expect(result.verdict).toBe('wrong');
    expect(result.correctAnswer).toBe('dog');
    expect(new Date(result.progress.cards['animals-01'].due).getTime()).toBeLessThan(new Date(rightDue).getTime());

    const askedAfter = answerGroup(engine, packs);
    expect(askedAfter).toEqual(['animals-02', 'animals-03', 'animals-04', 'animals-05', 'animals-01']);
  });
});

describe('progress', () => {
  it('starts with nothing learned', () => {
    const { engine } = engineWith([animals, bigPack(3)]);

    expect(engine.overview()).toEqual({
      wordsKnown: 0,
      fading: { count: 0, minutes: 0 },
      welcomeBack: false,
      packs: [
        { id: 'animals', title: 'Animals', learned: 0, total: 6 },
        { id: 'big', title: 'Big', learned: 0, total: 3 },
      ],
    });
  });

  it('counts a Card as learned once its latest answer was correct, per Pack and in total', () => {
    const packs = [animals, bigPack(3)];
    const { engine } = engineWith(packs);

    engine.startNewCards('animals');
    engine.answer('dog');
    engine.answer('cow'); // kat → wrong
    engine.answer('horse');

    expect(engine.overview()).toMatchObject({ wordsKnown: 2, packs: [{ id: 'animals', learned: 2 }, { id: 'big', learned: 0 }] });
  });

  it('is keyed by Card id, so it survives the Curator correcting a Card', () => {
    const packs = [animals];
    const { engine } = engineWith(packs);
    engine.startNewCards('animals');
    engine.answer('dog');

    const corrected: Pack = { ...animals, cards: [card('animals-01', 'hondje', 'little dog'), ...animals.cards.slice(1)] };
    const after = createEngine({ packs: [corrected], progress: engine.progress(), clock: createFakeClock(new Date()), random: () => 0.5 });

    expect(after.overview().wordsKnown).toBe(1);
    after.startNewCards('animals');
    expect(expectPrompt(after).cardId).toBe('animals-02');
  });

  it('keeps but ignores progress for Cards that no longer exist', () => {
    const packs = [animals];
    const { engine } = engineWith(packs);
    engine.startNewCards('animals');
    engine.answer('dog');
    engine.answer('cat');

    const trimmed: Pack = { ...animals, cards: animals.cards.slice(1) };
    const after = createEngine({ packs: [trimmed], progress: engine.progress(), clock: createFakeClock(new Date()), random: () => 0.5 });

    expect(after.overview()).toMatchObject({ wordsKnown: 1, packs: [{ learned: 1, total: 5 }] });
    expect(Object.keys(after.progress().cards).sort()).toEqual(['animals-01', 'animals-02']);
  });

  it('round-trips through JSON (as the progress store saves it)', () => {
    const packs = [animals];
    const { engine, clock } = engineWith(packs);
    engine.startNewCards('animals');
    engine.answer('dog');

    const saved: Progress = JSON.parse(JSON.stringify(engine.progress()));
    const after = createEngine({ packs, progress: saved, clock, random: () => 0.5 });

    expect(saved.version).toBe(1);
    expect(after.progress()).toEqual(engine.progress());
    expect(after.overview().wordsKnown).toBe(1);
  });
});

/** Saved progress for a Card that is in review: last answered correctly, with the given memory strength. */
function reviewed(due: string, stability: number, lastReview = '2025-12-01T10:00:00Z', reps = 2): CardProgress {
  return {
    due: new Date(due).toISOString(),
    lastCorrect: true,
    memory: { stability, difficulty: 5, scheduledDays: Math.round(stability), learningSteps: 0, reps, lapses: 0, state: 2, lastReview: new Date(lastReview).toISOString() },
  };
}

/** Learns animals-01 … 05 in one Burst at the clock's time: dog wrong (and left unanswered again), the rest right. */
function learnWithOneSlip(clock = createFakeClock(new Date('2026-01-01T10:00:00Z'))) {
  const { engine } = engineWith([animals], emptyProgress(), clock);
  engine.startNewCards('animals');
  for (const option of ['cat', 'cat', 'horse', 'fish', 'bird']) engine.answer(option);
  return { progress: engine.progress(), clock };
}

describe('fading Cards', () => {
  it('none are fading straight after learning', () => {
    const { progress, clock } = learnWithOneSlip();

    expect(engineWith([animals], progress, clock).engine.overview().fading).toEqual({ count: 0, minutes: 0 });
  });

  it('a Card answered wrongly fades first; the rest fade later', () => {
    const { progress, clock } = learnWithOneSlip();

    clock.advance(DAY + 60_000);
    expect(engineWith([animals], progress, clock).engine.overview().fading.count).toBe(1);

    clock.advance(30 * DAY);
    expect(engineWith([animals], progress, clock).engine.overview().fading.count).toBe(5);
  });

  it('a Card is fading from the moment it is due', () => {
    const due = '2026-02-01T10:00:00Z';
    const progress: Progress = { version: 1, cards: { 'animals-01': reviewed(due, 3) } };
    const at = (iso: string) => engineWith([animals], progress, createFakeClock(new Date(iso))).engine.overview().fading.count;

    expect(at('2026-02-01T09:59:59Z')).toBe(0);
    expect(at(due)).toBe(1);
  });

  it('estimates whole minutes of reviewing, rounding up', () => {
    const packs = [bigPack(15)];
    const cards = Object.fromEntries(packs[0].cards.map((c) => [c.id, reviewed('2026-01-01T00:00:00Z', 3)]));
    const clock = createFakeClock(new Date('2026-02-01T10:00:00Z'));

    const few = engineWith(packs, { version: 1, cards: Object.fromEntries(Object.entries(cards).slice(0, 1)) }, clock).engine;
    const many = engineWith(packs, { version: 1, cards }, clock).engine;

    expect(few.overview().fading).toEqual({ count: 1, minutes: 1 });
    expect(many.overview().fading).toEqual({ count: 15, minutes: Math.ceil((15 * REVIEW_SECONDS_PER_CARD) / 60) });
    expect(many.overview().fading.minutes).toBeGreaterThan(1);
  });
});

describe('reviewing fading Cards', () => {
  const now = new Date('2026-03-01T10:00:00Z');
  const progress: Progress = {
    version: 1,
    cards: {
      'animals-01': reviewed('2026-02-24T10:00:00Z', 10), // 5 days over, strong: 0.5
      'animals-02': reviewed('2026-02-27T10:00:00Z', 1), // 2 days over, weak: 2
      'animals-03': reviewed('2026-02-09T10:00:00Z', 30), // 20 days over, very strong: 0.67
      'animals-04': reviewed('2026-03-05T10:00:00Z', 10), // not due yet
    },
  };

  it('asks the most overdue Cards (relative to how well they were known) first, and only fading ones', () => {
    const { engine } = engineWith([animals], progress, createFakeClock(now));

    engine.startReview();

    expect(answerGroup(engine, [animals])).toEqual(['animals-02', 'animals-03', 'animals-01']);
    expect(engine.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: false });
  });

  it('reviewed Cards stop fading, and reviewing does not use up new Cards', () => {
    const { engine } = engineWith([animals], progress, createFakeClock(now));

    engine.startReview();
    answerGroup(engine, [animals]);

    expect(engine.overview().fading.count).toBe(0);
    engine.startNewCards('animals');
    expect(answerGroup(engine, [animals])).toEqual(['animals-05', 'animals-06']);
  });

  it('a wrong review is asked again before the review ends', () => {
    const { engine } = engineWith([animals], progress, createFakeClock(now));

    engine.startReview();
    engine.answer('nonsense');

    expect(answerGroup(engine, [animals])).toEqual(['animals-03', 'animals-01', 'animals-02']);
  });
});

describe('welcome back', () => {
  const lastBurst = new Date('2026-01-01T10:00:00Z');
  const savedAfterOneBurst = () => learnWithOneSlip(createFakeClock(lastBurst)).progress;
  const openAt = (progress: Progress, daysLater: number) =>
    engineWith([animals], progress, createFakeClock(new Date(lastBurst.getTime() + daysLater * DAY))).engine;

  it('is not shown on the very first Burst', () => {
    expect(openAt(emptyProgress(), 100).overview().welcomeBack).toBe(false);
  });

  it('is not shown after a short gap', () => {
    expect(openAt(savedAfterOneBurst(), WELCOME_BACK_AFTER_DAYS - 0.1).overview().welcomeBack).toBe(false);
  });

  it('is shown after a gap of the threshold or more, and stays for the whole Burst', () => {
    const engine = openAt(savedAfterOneBurst(), WELCOME_BACK_AFTER_DAYS);
    expect(engine.overview().welcomeBack).toBe(true);

    engine.startReview();
    answerGroup(engine, [animals]);
    expect(engine.overview().welcomeBack).toBe(true);
  });
});

describe('Cognates, False friends and Facts', () => {
  const fact = (text: string, kind: 'card' | 'pack', id: string) => ({ text, about: { kind, id } });

  it('carries a Card’s notes on its prompt, and leaves them out when it has none', () => {
    const packs: Pack[] = [
      {
        id: 'mix',
        title: 'Mix',
        cards: [
          card('mix-01', 'appel', 'apple', { cognate: true, fact: fact('Appeltaart is apple pie.', 'card', 'mix-01') }),
          card('mix-02', 'brutaal', 'cheeky', { pos: 'adjective', article: undefined, falseFriend: { looksLike: 'brutal' } }),
          card('mix-03', 'hond', 'dog'),
        ],
      },
    ];
    const { engine } = engineWith(packs);
    engine.startNewCards('mix');

    const notesAsked = [];
    for (let next = engine.nextPrompt(); next.kind === 'prompt'; next = engine.nextPrompt()) {
      notesAsked.push(next.notes);
      engine.answer(correctOption(packs, next));
    }

    expect(notesAsked).toEqual([{ cognate: true, fact: fact('Appeltaart is apple pie.', 'card', 'mix-01') }, { falseFriend: { looksLike: 'brutal' } }, undefined]);
  });

  it('offers one of the Pack’s Facts after each group of new Cards, a different one each group', () => {
    const packs: Pack[] = [{ ...bigPack(10), facts: [fact('First.', 'pack', 'big'), fact('Second.', 'pack', 'big')] }];
    const { engine } = engineWith(packs);

    const shown = [];
    for (let i = 0; i < 2; i++) {
      engine.startNewCards('big');
      answerGroup(engine, packs);
      const done = engine.nextPrompt();
      shown.push(done.kind === 'group-done' ? done.fact?.text : undefined);
    }

    expect(shown).toEqual(['First.', 'Second.']);
  });

  it('offers no Pack Fact after a review', () => {
    const packs: Pack[] = [{ ...animals, facts: [fact('Dutch has many animal sayings.', 'pack', 'animals')] }];
    const { engine, clock } = engineWith(packs);
    engine.startNewCards('animals');
    answerGroup(engine, packs);
    clock.advance(30 * DAY);

    const later = createEngine({ packs, progress: engine.progress(), clock, random: () => 0.5 });
    later.startReview();
    answerGroup(later, packs);

    expect(later.nextPrompt()).toEqual({ kind: 'group-done', canDoMore: false });
  });
});

describe('listen mode', () => {
  const withAudio = (progress: Progress, available = true) =>
    engineWith([animals], progress, createFakeClock(new Date('2026-01-01T10:00:00Z')), () => available).engine;

  /** The modes of every prompt in the current group, answering each correctly. */
  function modesOfGroup(engine: Engine): string[] {
    const modes: string[] = [];
    for (let next = engine.nextPrompt(); next.kind === 'prompt'; next = engine.nextPrompt()) {
      modes.push(next.mode);
      engine.answer(correctOption([animals], next));
    }
    return modes;
  }

  it('a new Card is always first met by recognising it, so the Learner sees it written', () => {
    const engine = withAudio(emptyProgress());

    engine.startNewCards('animals');

    expect(modesOfGroup(engine)).toEqual(['recognise', 'recognise', 'recognise', 'recognise', 'recognise']);
  });

  it('a Card met before alternates between listening and recognising', () => {
    const engine = withAudio(emptyProgress());
    engine.startNewCards('animals');
    engine.answer('nonsense'); // hond: wrong, so it comes back in this group

    const modes = modesOfGroup(engine);

    expect(modes).toEqual(['recognise', 'recognise', 'recognise', 'recognise', 'listen']);
  });

  it('a listen prompt carries the Dutch to speak, and the same four-option choice of meanings', () => {
    const engine = withAudio(emptyProgress());
    engine.startNewCards('animals');
    engine.answer('nonsense');
    for (const option of ['cat', 'horse', 'fish', 'bird']) engine.answer(option);

    const prompt = expectPrompt(engine);

    expect(prompt).toMatchObject({ mode: 'listen', cardId: 'animals-01', dutch: 'de hond' });
    expect(prompt.options).toHaveLength(4);
    expect(prompt.options).toContain('dog');
  });

  it('reviews mix listening in too', () => {
    const progress: Progress = {
      version: 1,
      cards: {
        'animals-01': reviewed('2026-01-01T00:00:00Z', 3), // answered twice before
        'animals-02': reviewed('2026-01-01T00:00:00Z', 2, undefined, 1), // answered once before
      },
    };
    const engine = withAudio(progress);

    engine.startReview();

    expect(modesOfGroup(engine)).toEqual(['listen', 'recognise']);
  });

  it('never asks to listen when the device has no Dutch voice', () => {
    const engine = withAudio(emptyProgress(), false);
    engine.startNewCards('animals');
    engine.answer('nonsense');

    expect(modesOfGroup(engine)).not.toContain('listen');
  });
});

describe('typed recall', () => {
  const now = new Date('2026-03-01T10:00:00Z');
  const strong = RECALL_AFTER_STABILITY_DAYS;
  const words: Pack = {
    id: 'words',
    title: 'Words',
    cards: [
      card('words-01', 'hond', 'dog'),
      card('words-02', 'café', 'café', { article: 'het' }),
      card('words-03', 'hallo', 'hello', { pos: 'interjection', article: undefined }),
      card('words-04', 'kat', 'cat'),
    ],
  };
  /** A review of the given Cards, all due now and as strong as given. */
  function reviewOf(stabilities: Record<string, number>, audio = false) {
    const cards = Object.fromEntries(Object.entries(stabilities).map(([id, s]) => [id, reviewed('2026-02-28T10:00:00Z', s)]));
    const clock = createFakeClock(now);
    const { engine } = engineWith([words], { version: 1, cards }, clock, () => audio);
    engine.startReview();
    return { engine, clock };
  }

  it('a strong Card is asked by typing: the English is shown, the Dutch is typed, no options', () => {
    const { engine } = reviewOf({ 'words-01': strong });

    expect(expectPrompt(engine)).toMatchObject({ mode: 'recall', english: 'dog', dutch: 'de hond', options: [] });
  });

  it('weaker Cards stay multiple choice (recognise or listen), even with audio', () => {
    const { engine } = reviewOf({ 'words-01': strong - 0.5 }, true);

    expect(expectPrompt(engine).mode).not.toBe('recall');
  });

  it('shows every meaning of a Card with several', () => {
    const packs: Pack[] = [{ id: 'p', title: 'P', cards: [card('p-01', 'dank je', '', { pos: 'phrase', article: undefined, english: ['thank you', 'thanks'] })] }];
    const { engine } = engineWith(packs, { version: 1, cards: { 'p-01': reviewed('2026-02-28T10:00:00Z', strong) } }, createFakeClock(now));
    engine.startReview();

    expect(expectPrompt(engine)).toMatchObject({ mode: 'recall', english: 'thank you, thanks' });
  });

  it.each([['de hond'], ['De Hond'], ['  de   hond '], ['DE HOND']])('ignores case and spacing: "%s" is correct', (typed) => {
    const { engine } = reviewOf({ 'words-01': strong });

    expect(engine.answer(typed)).toMatchObject({ verdict: 'correct', correctAnswer: 'de hond' });
  });

  it('ignores accents both ways', () => {
    expect(reviewOf({ 'words-02': strong }).engine.answer('het cafe').verdict).toBe('correct');
    expect(reviewOf({ 'words-01': strong }).engine.answer('de hónd').verdict).toBe('correct');
  });

  it('forgives what an iPhone keyboard does: curly apostrophes, the ĳ ligature, and end punctuation', () => {
    const packs: Pack[] = [
      {
        id: 'p',
        title: 'P',
        cards: [
          card('p-01', "auto's", 'cars', { pos: 'phrase', article: undefined }),
          card('p-02', 'ijs', 'ice cream', { article: 'het' }),
          card('p-03', 'hoe gaat het?', 'how are you?', { pos: 'phrase', article: undefined }),
        ],
      },
    ];
    const typed = (id: string, text: string) => {
      const { engine } = engineWith(packs, { version: 1, cards: { [id]: reviewed('2026-02-28T10:00:00Z', strong) } }, createFakeClock(now));
      engine.startReview();
      return engine.answer(text).verdict;
    };

    expect(typed('p-01', 'auto’s')).toBe('correct');
    expect(typed('p-02', 'het ĳs')).toBe('correct');
    expect(typed('p-03', 'Hoe gaat het')).toBe('correct');
    expect(typed('p-03', 'hoe gaat het ?')).toBe('correct');
  });

  it('a word without an article is typed on its own', () => {
    expect(reviewOf({ 'words-03': strong }).engine.answer('Hallo').verdict).toBe('correct');
  });

  it('the right noun with the wrong or a missing article is "almost", shows the right article, and is scheduled like a wrong answer', () => {
    const wrongArticle = reviewOf({ 'words-01': strong }).engine.answer('het hond');
    const noArticle = reviewOf({ 'words-01': strong }).engine.answer('hond');
    const wrong = reviewOf({ 'words-01': strong }).engine.answer('kat');

    expect(wrongArticle).toMatchObject({ verdict: 'almost', correctAnswer: 'de hond' });
    expect(noArticle).toMatchObject({ verdict: 'almost', correctAnswer: 'de hond' });
    expect(wrong).toMatchObject({ verdict: 'wrong', correctAnswer: 'de hond' });
    const due = (r: typeof wrong) => r.progress.cards['words-01'].due;
    expect(due(wrongArticle)).toBe(due(wrong));
    expect(due(noArticle)).toBe(due(wrong));
    expect(wrongArticle.progress.cards['words-01'].lastCorrect).toBe(false);
  });

  it('an almost or wrong typed answer comes back before the review ends, as a choice again now that it is weaker', () => {
    const { engine } = reviewOf({ 'words-01': strong, 'words-04': strong + 1 });

    engine.answer('het hond');

    expect(expectPrompt(engine).cardId).toBe('words-04');
    engine.answer('de kat');
    expect(expectPrompt(engine)).toMatchObject({ cardId: 'words-01', mode: 'recognise', dutch: 'de hond' });
  });

  it('a fast correct answer is graded Easy: the Card comes back later than after a slow one', () => {
    const fast = reviewOf({ 'words-01': strong });
    expectPrompt(fast.engine);
    fast.clock.advance((FAST_RECALL_SECONDS - 1) * 1000);
    const quick = fast.engine.answer('de hond');

    const slow = reviewOf({ 'words-01': strong });
    expectPrompt(slow.engine);
    slow.clock.advance((FAST_RECALL_SECONDS + 1) * 1000);
    const thoughtful = slow.engine.answer('de hond');

    expect(quick.verdict).toBe('correct');
    expect(thoughtful.verdict).toBe('correct');
    expect(new Date(quick.progress.cards['words-01'].due).getTime()).toBeGreaterThan(new Date(thoughtful.progress.cards['words-01'].due).getTime());
  });
});
