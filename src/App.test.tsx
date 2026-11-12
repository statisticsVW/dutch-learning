import { describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { App } from './App';
import type { Pack } from './content/types';
import { createMemoryProgressStore } from './adapters/progress-store';
import { createFakeClock } from './adapters/clock';
import { createFakeSpeech } from './adapters/speech';

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

describe('coming back after a gap', () => {
  const DAY = 24 * 60 * 60 * 1000;

  /** A first Burst that learns five Cards, then the app opened again `days` later. */
  function comeBackAfter(days: number) {
    const store = renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: meaningOf(shownDutch()) }));
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
    cleanup();
    const clock = createFakeClock(new Date(new Date('2026-01-01T10:00:00Z').getTime() + days * DAY));
    render(<App packs={[animals]} store={store} clock={clock} random={() => 0.5} />);
    return store;
  }

  it('welcomes the Learner back and offers the fading Cards, without making them review first', () => {
    comeBackAfter(30);

    expect(screen.getByText(/Welcome back/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Review 5 fading Cards/ })).toBeTruthy();
    expect(screen.getByText(/about 1 minute/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    expect(shownDutch()).toBe('de koe');
  });

  it('reviewing the fading Cards clears them', () => {
    const store = comeBackAfter(30);
    fireEvent.click(screen.getByRole('button', { name: /Review 5 fading Cards/ }));
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: meaningOf(shownDutch()) }));
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }

    expect(screen.getByText(/All reviewed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Packs' }));
    expect(screen.queryByRole('button', { name: /fading/ })).toBeNull();
    expect(store.saved).toHaveLength(10);
  });

  it('a short gap brings neither welcome back nor fading Cards', () => {
    comeBackAfter(1);

    expect(screen.queryByText(/Welcome back/)).toBeNull();
    expect(screen.queryByRole('button', { name: /fading/ })).toBeNull();
  });
});

describe('an installed app brought back from the background', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const setVisibility = (state: 'hidden' | 'visible') => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  };

  it('starts a new Burst after a long time away, so the welcome back and fading Cards show', () => {
    const store = createMemoryProgressStore();
    const clock = createFakeClock(new Date('2026-01-01T10:00:00Z'));
    render(<App packs={[animals]} store={store} clock={clock} random={() => 0.5} />);
    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: meaningOf(shownDutch()) }));
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }

    setVisibility('hidden');
    clock.advance(30 * DAY);
    setVisibility('visible');

    expect(screen.getByText(/Welcome back/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Review 5 fading Cards/ })).toBeTruthy();
  });

  it('carries on where it was after a short time away', () => {
    const clock = createFakeClock(new Date('2026-01-01T10:00:00Z'));
    render(<App packs={[animals]} store={createMemoryProgressStore()} clock={clock} random={() => 0.5} />);
    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    const asked = shownDutch();

    setVisibility('hidden');
    clock.advance(60_000);
    setVisibility('visible');

    expect(shownDutch()).toBe(asked);
  });
});

describe('listening', () => {
  function renderWithSpeech(available: boolean) {
    const speech = createFakeSpeech(available);
    render(
      <App packs={[animals]} store={createMemoryProgressStore()} clock={createFakeClock(new Date('2026-01-01T10:00:00Z'))} random={() => 0.5} speech={speech} />,
    );
    return speech;
  }

  /** Answers the first prompt wrongly and the next four rightly, so the first Card comes back. */
  function slipOnceThenAnswerFour() {
    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    const first = meaningOf(shownDutch());
    const wrong = ['dog', 'cat', 'horse', 'fish', 'bird', 'cow'].find((o) => o !== first && screen.queryByRole('button', { name: o }))!;
    fireEvent.click(screen.getByRole('button', { name: wrong }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: meaningOf(shownDutch()) }));
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
    return first;
  }

  it('without a Dutch voice: a quiet note, and every prompt is written', async () => {
    renderWithSpeech(false);

    expect(await screen.findByText(/Audio isn’t available on this device/)).toBeTruthy();
    slipOnceThenAnswerFour();
    expect(shownDutch()).toBe('de hond');
    expect(screen.queryByRole('button', { name: /Hear it/ })).toBeNull();
  });

  it('with a Dutch voice: any Card can be heard, and the tap that starts practice unlocks speech', async () => {
    const speech = renderWithSpeech(true);
    await act(async () => {});
    expect(screen.queryByText(/Audio isn’t available/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Animals/ }));
    expect(speech.unlocks).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Hear it in Dutch' }));
    expect(speech.spoken).toEqual(['de hond']);
  });

  it('with a Dutch voice: a Card met before may be asked by ear, and plays by itself', async () => {
    const speech = renderWithSpeech(true);
    await act(async () => {});
    const first = slipOnceThenAnswerFour();

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Listen: what does it mean?');
    expect(speech.spoken).toEqual(['de hond']);
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(speech.spoken).toEqual(['de hond', 'de hond']);
    fireEvent.click(screen.getByRole('button', { name: first }));
    expect(screen.getByText('Goed zo!')).toBeTruthy();
    expect(shownDutch()).toBe('de hond');
  });
});

describe('typed recall', () => {
  const fruit: Pack = {
    id: 'fruit',
    title: 'Fruit',
    cards: [{ id: 'fruit-01', dutch: 'appel', english: ['apple'], pos: 'noun', article: 'de' }],
  };
  /** A Learner who knows "de appel" well, and it is due for review. */
  function renderWithStrongAppel() {
    const memory = { stability: 20, difficulty: 5, scheduledDays: 20, learningSteps: 0, reps: 3, lapses: 0, state: 2, lastReview: '2026-01-01T10:00:00.000Z' };
    const store = createMemoryProgressStore({ version: 1, cards: { 'fruit-01': { due: '2026-01-21T10:00:00.000Z', lastCorrect: true, memory } } });
    render(<App packs={[fruit]} store={store} clock={createFakeClock(new Date('2026-01-22T10:00:00Z'))} random={() => 0.5} />);
    fireEvent.click(screen.getByRole('button', { name: /Review 1 fading Card/ }));
    return store;
  }
  const typeAndCheck = (text: string) => {
    fireEvent.input(screen.getByRole('textbox', { name: 'Type it in Dutch' }), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
  };

  it('shows the English and takes the Dutch typed, with an iPhone-friendly field', () => {
    renderWithStrongAppel();

    expect(screen.getByText('apple')).toBeTruthy();
    expect(screen.queryByText(/appel/)).toBeNull();
    const field = screen.getByRole('textbox', { name: 'Type it in Dutch' });
    expect(field.getAttribute('autocapitalize')).toBe('off');
    expect(field.getAttribute('autocorrect')).toBe('off');
  });

  it('typing "het appel" for "de appel" is almost, and shows the right article kindly', () => {
    const store = renderWithStrongAppel();

    typeAndCheck('het appel');

    expect(screen.getByText(/Almost!/)).toBeTruthy();
    expect(screen.getByText(/it’s de appel/)).toBeTruthy();
    expect(store.saved.at(-1)!.cards['fruit-01'].lastCorrect).toBe(false);
  });

  it('a correct answer, typed without worrying about capitals', () => {
    renderWithStrongAppel();

    typeAndCheck('De Appel');

    expect(screen.getByText('Goed zo!')).toBeTruthy();
  });

  it('a wrong answer shows the right one', () => {
    renderWithStrongAppel();

    typeAndCheck('de peer');

    expect(screen.getByText(/Not quite: it’s de appel/)).toBeTruthy();
  });
});

describe('typed recall timing and notes', () => {
  const pair: Pack = {
    id: 'pair',
    title: 'Pair',
    cards: [
      { id: 'pair-01', dutch: 'appel', english: ['apple'], pos: 'noun', article: 'de', cognate: true },
      { id: 'pair-02', dutch: 'peer', english: ['pear'], pos: 'noun', article: 'de' },
    ],
  };
  function startReview(clock = createFakeClock(new Date('2026-01-22T10:00:00Z'))) {
    const memory = { stability: 20, difficulty: 5, scheduledDays: 20, learningSteps: 0, reps: 3, lapses: 0, state: 2, lastReview: '2026-01-01T10:00:00.000Z' };
    const due = (stability: number) => ({ due: '2026-01-21T10:00:00.000Z', lastCorrect: true, memory: { ...memory, stability } });
    const store = createMemoryProgressStore({ version: 1, cards: { 'pair-01': due(20), 'pair-02': due(21) } });
    render(<App packs={[pair]} store={store} clock={clock} random={() => 0.5} />);
    fireEvent.click(screen.getByRole('button', { name: /Review 2 fading Cards/ }));
    return { store, clock };
  }
  const typeAndCheck = (text: string) => {
    fireEvent.input(screen.getByRole('textbox', { name: 'Type it in Dutch' }), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
  };

  it('time spent reading the feedback does not count against the next typed answer', () => {
    const lingered = startReview();
    typeAndCheck('de appel');
    lingered.clock.advance(60_000); // reading the feedback for a minute
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    typeAndCheck('de peer');
    const afterLingering = lingered.store.saved.at(-1)!.cards['pair-02'].due;
    cleanup();

    const quick = startReview();
    typeAndCheck('de appel');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    typeAndCheck('de peer');

    expect(afterLingering).toBe(new Date(new Date(quick.store.saved.at(-1)!.cards['pair-02'].due).getTime() + 60_000).toISOString());
  });

  it('a Cognate note waits until after a typed answer, so it does not give the answer away', () => {
    startReview();

    expect(screen.queryByText(/You already know this one/)).toBeNull();
    typeAndCheck('de appel');
    expect(screen.getByText(/You already know this one/)).toBeTruthy();
  });
});
