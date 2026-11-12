import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/preact';
import { PackList } from './PackList';

const packs = [
  { id: 'hello', title: 'Hello & being polite', learned: 2, total: 5 },
  { id: 'food', title: 'Food', learned: 0, total: 12 },
];

describe('PackList', () => {
  it('lists each Pack with a progress ring of Cards learned out of Cards in the Pack', () => {
    render(<PackList packs={packs} onPick={() => {}} />);

    const items = within(screen.getByRole('list', { name: 'Packs' })).getAllByRole('button');
    expect(items.map((b) => b.textContent)).toEqual(['Hello & being polite', 'Food']);
    expect(screen.getByRole('img', { name: '2 of 5 learned' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '0 of 12 learned' })).toBeTruthy();
  });

  it('picks a Pack', () => {
    const onPick = vi.fn();
    render(<PackList packs={packs} onPick={onPick} />);

    fireEvent.click(screen.getByRole('button', { name: /Food/ }));

    expect(onPick).toHaveBeenCalledWith('food');
  });
});
