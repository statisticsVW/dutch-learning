import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/preact';
import { createFakeAppUpdates } from '../adapters/app-updates';
import { UpdateNote } from './UpdateNote';

describe('the update note', () => {
  it('shows nothing until a new version is ready', () => {
    render(<UpdateNote updates={createFakeAppUpdates()} reload={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /New version/ })).toBeNull();
  });

  it('offers the new version once it has arrived, and switches to it with one tap', () => {
    const updates = createFakeAppUpdates();
    const reload = vi.fn();
    render(<UpdateNote updates={updates} reload={reload} />);

    act(() => updates.announce());
    fireEvent.click(screen.getByRole('button', { name: 'New version: tap to update' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
