import { beforeEach, describe, expect, it } from 'vitest';
import { emptyProgress, type Progress } from '../engine/engine';
import { createLocalProgressStore, PROGRESS_KEY } from './progress-store';

const sample: Progress = {
  version: 1,
  cards: { 'hello-01': { due: '2026-01-03T10:00:00.000Z', lastCorrect: true, memory: { stability: 2.3, difficulty: 5, scheduledDays: 2, learningSteps: 0, reps: 1, lapses: 0, state: 2 } } },
};

describe('the on-device progress store', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty on a fresh device', () => {
    expect(createLocalProgressStore(localStorage).load()).toEqual(emptyProgress());
  });

  it('gives back what it saved, across store instances (a reload)', () => {
    createLocalProgressStore(localStorage).save(sample);

    expect(createLocalProgressStore(localStorage).load()).toEqual(sample);
  });

  it('starts empty but keeps unreadable saved data aside rather than overwriting it', () => {
    localStorage.setItem(PROGRESS_KEY, '{not json');

    const store = createLocalProgressStore(localStorage);
    expect(store.load()).toEqual(emptyProgress());
    store.save(sample);

    expect(localStorage.getItem(`${PROGRESS_KEY}.unreadable`)).toBe('{not json');
  });

  it('treats progress from an unknown version as unreadable', () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 99, cards: {} }));

    expect(createLocalProgressStore(localStorage).load()).toEqual(emptyProgress());
    expect(localStorage.getItem(`${PROGRESS_KEY}.unreadable`)).toContain('"version":99');
  });
});
