import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { App } from './App';
import type { Pack } from './content/types';
import { createMemoryProgressStore } from './adapters/progress-store';
import { createFakeClock } from './adapters/clock';

const animals: Pack = {
  id: 'animals',
  title: 'Animals',
  cards: [
    ['hond', 'dog'],
    ['kat', 'cat'],
    ['paard', 'horse', 'het'],
    ['vis', 'fish'],
    ['vogel', 'bird'],
    ['koe', 'cow'],
  ].map(([dutch, english, article = 'de'], i) => ({ id: `animals-0${i + 1}`, dutch, english: [english], pos: 'noun', article: article as 'de' | 'het' })),
};
const meaningOf = (shown: string) => animals.cards.find((c) => `${c.article} ${c.dutch}` === shown)!.english[0];

function renderApp() {
  const store = createMemoryProgressStore();
  render(<App packs={[animals]} store={store} clock={createFakeClock(new Date('2026-01-01T10:00:00Z'))} random={() => 0.5} />);
  return store;
}

const shownDutch = () => screen.getByRole('heading', { level: 2 }).textContent!;

describe('a first Burst', () => {
  it('picks a Pack, learns a group of five by recognising them, and the progress ring moves', () => {
    const store = renderApp();
    expect(screen.getByText('You know 0 Dutch words')).toBeTruthy();
    expect(screen.getByRole('img', { name: '0 of 6 learned' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: meaningOf(shownDutch()) }));
      expect(screen.getByText('Goed zo!')).toBeTruthy();
      expect(store.saved).toHaveLength(i + 1);
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }

    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Packs' }));
    expect(screen.getByText('You know 5 Dutch words')).toBeTruthy();
    expect(screen.getByRole('img', { name: '5 of 6 learned' })).toBeTruthy();
  });

  it('shows the right answer straight after a wrong one', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));

    const right = meaningOf(shownDutch());
    const wrong = ['dog', 'cat', 'horse', 'fish', 'bird', 'cow'].find((o) => o !== right && screen.queryByRole('button', { name: o }))!;
    fireEvent.click(screen.getByRole('button', { name: wrong }));

    expect(screen.getByText(`Not quite: it means "${right}".`)).toBeTruthy();
  });

  it('picks up where it left off after a reload', () => {
    const store = renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    fireEvent.click(screen.getByRole('button', { name: meaningOf(shownDutch()) }));
    cleanup();

    render(<App packs={[animals]} store={store} clock={createFakeClock(new Date('2026-01-01T10:05:00Z'))} />);

    expect(screen.getByText('You know 1 Dutch word')).toBeTruthy();
  });
});
