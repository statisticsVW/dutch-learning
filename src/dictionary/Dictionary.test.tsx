import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/preact';
import { App } from '../App';
import type { DictionaryEntry, Pack } from '../content/types';
import { createMemoryProgressStore } from '../adapters/progress-store';
import { createMemoryMyWordsStore } from '../adapters/my-words-store';
import { createFakeClock } from '../adapters/clock';

const hello: Pack = {
  id: 'hello',
  title: 'Hello',
  cards: [
    { id: 'hello-01', dutch: 'hallo', english: ['hello'], pos: 'interjection' },
    { id: 'hello-02', dutch: 'naam', english: ['name'], pos: 'noun', article: 'de' },
    { id: 'hello-03', dutch: 'ja', english: ['yes'], pos: 'interjection' },
  ],
};
const dictionary: DictionaryEntry[] = [
  { id: 'dict-boek', dutch: 'boek', english: ['book'], pos: 'noun', article: 'het' },
  { id: 'dict-hond', dutch: 'hond', english: ['dog'], pos: 'noun', article: 'de' },
  { id: 'dict-cafe', dutch: 'café', english: ['café'], pos: 'noun', article: 'het' },
];

function renderApp(myWords = createMemoryMyWordsStore(), load = () => Promise.resolve(dictionary)) {
  const progress = createMemoryProgressStore();
  render(
    <App packs={[hello]} store={progress} clock={createFakeClock(new Date('2026-01-01T10:00:00Z'))} random={() => 0.5} dictionary={{ load, myWords }} />,
  );
  return { progress, myWords };
}

async function openDictionaryAndSearch(query: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Search the Dictionary' }));
  const box = await screen.findByRole('searchbox', { name: 'Search in English or Dutch' });
  fireEvent.input(box, { target: { value: query } });
}

describe('Dictionary and Mijn woorden', () => {
  it('searches, adds a word, then practises it in Mijn woorden', async () => {
    const { progress, myWords } = renderApp();
    await openDictionaryAndSearch('BOOK');

    const results = screen.getByRole('list', { name: 'Results' });
    expect(within(results).getByText('het boek')).toBeTruthy();
    fireEvent.click(within(results).getByRole('button', { name: 'Add het boek to Mijn woorden' }));

    const mine = screen.getByRole('list', { name: 'Mijn woorden' });
    expect(within(mine).getByText('het boek')).toBeTruthy();
    expect(myWords.saved.at(-1)!.map((w) => w.id)).toEqual(['dict-boek']);

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('img', { name: '0 of 1 learned' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Mijn woorden/ }));

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('het boek');
    fireEvent.click(screen.getByRole('button', { name: 'book' }));
    expect(screen.getByText('Goed zo!')).toBeTruthy();
    expect(Object.keys(progress.saved.at(-1)!.cards)).toEqual(['dict-boek']);
  });

  it('removes a word from Mijn woorden', async () => {
    const { myWords } = renderApp(createMemoryMyWordsStore([dictionary[1]]));
    expect(screen.getByRole('button', { name: /Mijn woorden/ })).toBeTruthy();
    await openDictionaryAndSearch('');

    fireEvent.click(screen.getByRole('button', { name: 'Remove de hond from Mijn woorden' }));

    expect(myWords.saved.at(-1)).toEqual([]);
    expect(screen.getByText(/No words yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('button', { name: /Mijn woorden/ })).toBeNull();
  });

  it('shows an added word as already in Mijn woorden in the results', async () => {
    renderApp(createMemoryMyWordsStore([dictionary[1]]));
    await openDictionaryAndSearch('hond');

    const results = screen.getByRole('list', { name: 'Results' });
    expect(within(results).queryByRole('button', { name: /Add/ })).toBeNull();
    expect(within(results).getByText('In Mijn woorden')).toBeTruthy();
  });

  it('says kindly when a word is not in the Dictionary yet', async () => {
    renderApp();
    await openDictionaryAndSearch('xylofoon');

    expect(screen.getByText('“xylofoon” is not in my dictionary yet.')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Results' })).toBeNull();
  });

  it('explains when the Dictionary cannot be loaded', async () => {
    renderApp(createMemoryMyWordsStore(), () => Promise.reject(new Error('offline')));
    fireEvent.click(screen.getByRole('button', { name: 'Search the Dictionary' }));

    expect(await screen.findByText(/The Dictionary could not be loaded/)).toBeTruthy();
  });
});
