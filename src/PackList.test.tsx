import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/preact';
import { PackList } from './PackList';
import type { Pack } from './content/types';

const packs: Pack[] = [
  {
    id: 'hello',
    title: 'Hello & being polite',
    cards: [
      { id: 'hello-01', dutch: 'hallo', english: ['hello'], pos: 'interjection' },
      { id: 'hello-02', dutch: 'dank je', english: ['thank you'], pos: 'phrase' },
    ],
  },
  { id: 'food', title: 'Food', cards: [{ id: 'food-01', dutch: 'appel', english: ['apple'], pos: 'noun', article: 'de' }] },
];

describe('PackList', () => {
  it('lists each Pack with its title and how many Cards it has', () => {
    render(<PackList packs={packs} />);

    const items = within(screen.getByRole('list', { name: 'Packs' })).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['Hello & being polite2 Cards', 'Food1 Card']);
  });
});
