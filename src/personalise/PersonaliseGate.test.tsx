import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { PersonaliseGate } from './PersonaliseGate';
import { createMemoryPersonalisationStore, type PersonalisationStore } from '../adapters/personalisation-store';

/** Stands in for the app, with some state of its own so we can tell whether it was restarted. */
function FakeApp() {
  const [taps, setTaps] = useState(0);
  return <button onClick={() => setTaps(taps + 1)}>Tapped {taps}</button>;
}

function renderApp(store: PersonalisationStore) {
  return render(
    <PersonaliseGate store={store}>
      <FakeApp />
    </PersonaliseGate>,
  );
}

const welcome = () => screen.queryByRole('heading', { name: /make it yours/i });
const appName = () => within(screen.getByRole('banner')).getByRole('heading', { level: 1 }).textContent;
const theme = () => document.documentElement.dataset.theme;

function choose(name: string, themeLabel: RegExp) {
  fireEvent.input(screen.getByRole('textbox', { name: /name/i }), { target: { value: name } });
  fireEvent.click(screen.getByRole('radio', { name: themeLabel }));
}

describe('naming the app and picking a theme', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    document.title = '';
  });

  it('on first launch asks for a name and a theme before showing the app', () => {
    renderApp(createMemoryPersonalisationStore());

    expect(welcome()).not.toBeNull();
    expect(screen.queryByRole('button', { name: /tapped/i })).toBeNull();
    expect(screen.getAllByRole('radio').length).toBeGreaterThanOrEqual(3);
  });

  it('shows the chosen name in the header and applies the theme, then never asks again', () => {
    const store = createMemoryPersonalisationStore();
    renderApp(store);

    choose('  Testapp  ', /blauw/i);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    expect(welcome()).toBeNull();
    expect(appName()).toBe('Testapp');
    expect(document.title).toBe('Testapp');
    expect(theme()).toBe('blauw');
    expect(screen.getByRole('button', { name: /tapped/i })).not.toBeNull();
    cleanup();
    delete document.documentElement.dataset.theme;

    renderApp(store);

    expect(welcome()).toBeNull();
    expect(appName()).toBe('Testapp');
    expect(theme()).toBe('blauw');
  });

  it('calls the app "Dutch" if the Learner leaves the name empty', () => {
    renderApp(createMemoryPersonalisationStore());

    choose('   ', /groen/i);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    expect(appName()).toBe('Dutch');
    expect(theme()).toBe('groen');
  });

  it('lets the Learner change the name and theme in settings without losing his place', () => {
    const store = createMemoryPersonalisationStore({ name: 'Testapp', theme: 'oranje' });
    renderApp(store);
    fireEvent.click(screen.getByRole('button', { name: /tapped 0/i }));

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByRole('textbox', { name: /name/i })).toHaveProperty('value', 'Testapp');
    expect(screen.getByRole('radio', { name: /oranje/i })).toHaveProperty('checked', true);
    choose('Andere naam', /nacht/i);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(appName()).toBe('Andere naam');
    expect(theme()).toBe('nacht');
    expect(store.load()).toEqual({ name: 'Andere naam', theme: 'nacht' });
    expect(screen.getByRole('button', { name: /tapped 1/i })).not.toBeNull();
  });

  it('leaves everything as it was when settings are cancelled', () => {
    const store = createMemoryPersonalisationStore({ name: 'Testapp', theme: 'paars' });
    renderApp(store);

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    choose('Iets anders', /groen/i);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(appName()).toBe('Testapp');
    expect(theme()).toBe('paars');
    expect(store.load()).toEqual({ name: 'Testapp', theme: 'paars' });
    expect(screen.getByRole('button', { name: /tapped/i })).not.toBeNull();
  });
});
