import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalPersonalisationStore, PERSONALISATION_KEY } from './personalisation-store';

describe('the on-device personalisation store', () => {
  beforeEach(() => localStorage.clear());

  it('has nothing on a fresh device, so the app knows it is a first launch', () => {
    expect(createLocalPersonalisationStore(localStorage).load()).toBeUndefined();
  });

  it('gives back the name and theme it saved, across store instances (a reload)', () => {
    createLocalPersonalisationStore(localStorage).save({ name: 'Testapp', theme: 'groen' });

    expect(createLocalPersonalisationStore(localStorage).load()).toEqual({ name: 'Testapp', theme: 'groen' });
  });

  it('keeps the name but falls back to the default theme when the saved theme no longer exists', () => {
    localStorage.setItem(PERSONALISATION_KEY, JSON.stringify({ version: 1, name: 'Testapp', theme: 'removed-theme' }));

    expect(createLocalPersonalisationStore(localStorage).load()).toEqual({ name: 'Testapp', theme: 'oranje' });
  });

  it('treats unreadable saved data as a first launch', () => {
    localStorage.setItem(PERSONALISATION_KEY, '{not json');

    expect(createLocalPersonalisationStore(localStorage).load()).toBeUndefined();
  });
});
