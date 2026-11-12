import { describe, expect, it } from 'vitest';
import type { Card, Pack } from '../content/types';
import { createEngine, emptyProgress, type Engine, type Progress, type Prompt } from './engine';
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

function engineWith(packs: Pack[], progress: Progress = emptyProgress(), clock = createFakeClock(new Date('2026-01-01T10:00:00Z'))) {
  return { engine: createEngine({ packs, progress, clock, random: () => 0.5 }), clock };
}

function expectPrompt(engine: Engine): Prompt {
  const next = engine.nextPrompt();
  if (next.kind !== 'prompt') throw new Error(`expected a prompt, got ${next.kind}`);
  return next;
}

function correctOption(packs: Pack[], prompt: Prompt): string {
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
