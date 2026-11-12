import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { About } from './About';
import { PersonaliseGate } from '../personalise/PersonaliseGate';
import { createMemoryPersonalisationStore } from '../adapters/personalisation-store';

describe('the About screen', () => {
  it('credits each content source with its licence, linking to both', () => {
    render(<About onBack={() => {}} />);

    for (const [source, licence] of [
      ['NT2Lex', 'CC BY-NC-SA 4.0'],
      ['Wiktionary', 'CC BY-SA 4.0'],
      ['Tatoeba', 'CC BY 2.0 FR'],
    ]) {
      const credit = screen.getByRole('listitem', { name: source });
      expect(within(credit).getByRole('link', { name: source }).getAttribute('href')).toMatch(/^https:\/\//);
      expect(within(credit).getByRole('link', { name: licence }).getAttribute('href')).toMatch(/^https:\/\/creativecommons\.org\/licenses\//);
    }
  });

  it('opens from Settings and goes back to Settings', () => {
    const store = createMemoryPersonalisationStore();
    store.save({ name: 'Testapp', theme: 'blauw' });
    function FakeApp() {
      const [taps, setTaps] = useState(0);
      return <button onClick={() => setTaps(taps + 1)}>Tapped {taps}</button>;
    }
    render(
      <PersonaliseGate store={store}>
        <FakeApp />
      </PersonaliseGate>,
    );

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /about/i }));

    expect(screen.getByRole('heading', { name: /about/i })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: /settings/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('heading', { name: /settings/i })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: /about/i })).toBeNull();
  });
});
