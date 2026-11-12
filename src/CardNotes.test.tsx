import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/preact';
import { App } from './App';
import type { Card, Pack } from './content/types';
import { createMemoryProgressStore } from './adapters/progress-store';
import { createFakeClock } from './adapters/clock';

const appel: Card = {
  id: 'food-01',
  dutch: 'appel',
  english: ['apple'],
  pos: 'noun',
  article: 'de',
  cognate: true,
  fact: { text: 'Appeltaart (apple pie) is a Dutch favourite.', about: { kind: 'card', id: 'food-01' } },
};
const brutaal: Card = { id: 'food-02', dutch: 'brutaal', english: ['cheeky'], pos: 'adjective', falseFriend: { looksLike: 'brutal' } };
const brood: Card = { id: 'food-03', dutch: 'brood', english: ['bread'], pos: 'noun', article: 'het' };
const food: Pack = {
  id: 'food',
  title: 'Food',
  facts: [{ text: 'The Dutch put chocolate sprinkles (hagelslag) on bread.', about: { kind: 'pack', id: 'food' } }],
  cards: [appel, brutaal, brood],
};

function startFood() {
  render(<App packs={[food]} store={createMemoryProgressStore()} clock={createFakeClock(new Date('2026-01-01T10:00:00Z'))} random={() => 0.5} />);
  fireEvent.click(screen.getByRole('button', { name: /Food/ }));
}

const answer = (meaning: string) => fireEvent.click(screen.getByRole('button', { name: meaning }));
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

describe('Cognates, False friends and Facts in practice', () => {
  it('greets a Cognate with "you already know this one!", then shares its Fact', () => {
    startFood();

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('de appel');
    expect(screen.getByText(/You already know this one!/)).toBeTruthy();

    answer('apple');
    expect(screen.getByText('Did you know?')).toBeTruthy();
    expect(screen.getByText('Appeltaart (apple pie) is a Dutch favourite.')).toBeTruthy();
  });

  it('warns about a False friend before the answer, and explains the trap after it', () => {
    startFood();
    answer('apple');
    next();

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('brutaal');
    expect(screen.getByText(/False friend!/)).toBeTruthy();
    expect(screen.queryByText(/You already know this one!/)).toBeNull();

    answer('cheeky');
    expect(screen.getByText('“brutaal” looks like “brutal”, but it means “cheeky”.')).toBeTruthy();
  });

  it('shows no notes on a Card without any', () => {
    startFood();
    answer('apple');
    next();
    answer('cheeky');
    next();

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('het brood');
    expect(screen.queryByText(/You already know this one!|False friend!/)).toBeNull();
    answer('bread');
    expect(screen.queryByText('Did you know?')).toBeNull();
  });

  it('shares a Fact about the Pack when a group of new Cards is done', () => {
    startFood();
    for (const meaning of ['apple', 'cheeky', 'bread']) {
      answer(meaning);
      next();
    }

    expect(screen.getByText('Did you know?')).toBeTruthy();
    expect(screen.getByText('The Dutch put chocolate sprinkles (hagelslag) on bread.')).toBeTruthy();
  });
});
