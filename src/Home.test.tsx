import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/preact';
import { App } from './App';
import type { Pack } from './content/types';
import { PersonaliseGate } from './personalise/PersonaliseGate';
import { createMemoryPersonalisationStore } from './adapters/personalisation-store';
import { createMemoryProgressStore } from './adapters/progress-store';
import { createFakeClock } from './adapters/clock';

const animals: Pack = {
  id: 'animals',
  title: 'Animals',
  cards: [
    { id: 'animals-01', dutch: 'hond', english: ['dog'], pos: 'noun', article: 'de' },
    { id: 'animals-02', dutch: 'kat', english: ['cat'], pos: 'noun', article: 'de' },
  ],
};

/** The whole app as the Learner sees it after first launch: the header with his chosen name, then the app. */
function renderApp() {
  const dictionary = { load: () => Promise.resolve([]), myWords: { load: () => [], save: () => {} } };
  render(
    <PersonaliseGate store={createMemoryPersonalisationStore({ name: 'Mijn Nederlands', theme: 'oranje' })}>
      <App packs={[animals]} store={createMemoryProgressStore()} clock={createFakeClock(new Date('2026-01-01T10:00:00Z'))} random={() => 0.5} dictionary={dictionary} />
    </PersonaliseGate>,
  );
}

const goHome = () => fireEvent.click(screen.getByRole('button', { name: 'Home' }));
const onHome = () => screen.queryByRole('button', { name: /Animals/ }) !== null && screen.queryByText(/You know \d+ Dutch word/) !== null;

describe('the Home button', () => {
  it('is on the home screen itself, so it is always in the same place', () => {
    renderApp();

    expect(screen.getByRole('button', { name: 'Home' })).toBeTruthy();
    expect(onHome()).toBe(true);
  });

  it('leaves practice for the home screen, keeping what was answered', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    fireEvent.click(screen.getByRole('button', { name: 'dog' }));

    goHome();

    expect(onHome()).toBe(true);
    expect(screen.getByText('You know 1 Dutch word')).toBeTruthy();
  });

  it('leaves the Dictionary for the home screen', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Search the Dictionary' }));
    await act(async () => {});

    goHome();

    expect(onHome()).toBe(true);
  });

  it('leaves Settings, and About, for the home screen', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    goHome();
    expect(onHome()).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'About and credits' }));
    goHome();
    expect(onHome()).toBe(true);
  });

  it('from Settings, also leaves a practice that was going on underneath', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    goHome();

    expect(onHome()).toBe(true);
  });
});
