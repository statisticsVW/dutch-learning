import { describe, expect, it, vi } from 'vitest';
import { createBrowserSpeech, pickDutchVoice, type SpeechSynthesisLike } from './speech';

const voice = (lang: string, name = lang) => ({ lang, name }) as SpeechSynthesisVoice;

/** A stand-in for the browser's speechSynthesis, whose voices can arrive late. */
function fakeSynth(initial: SpeechSynthesisVoice[]) {
  let voices = initial;
  const listeners = new Set<() => void>();
  const said: SpeechSynthesisUtterance[] = [];
  const synth = {
    getVoices: () => voices,
    speak: (u: SpeechSynthesisUtterance) => said.push(u),
    cancel: vi.fn(),
    speaking: false,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  } as unknown as SpeechSynthesisLike;
  const arrive = (later: SpeechSynthesisVoice[]) => {
    voices = later;
    listeners.forEach((l) => l());
  };
  return { synth, said, arrive };
}

const utterance = (text: string) => ({ text }) as SpeechSynthesisUtterance;

describe('picking a Dutch voice', () => {
  it('prefers nl-NL, falls back to other Dutch, and finds none otherwise', () => {
    expect(pickDutchVoice([voice('en-US'), voice('nl-BE'), voice('nl-NL')])?.lang).toBe('nl-NL');
    expect(pickDutchVoice([voice('en-GB'), voice('nl_BE')])?.lang).toBe('nl_BE');
    expect(pickDutchVoice([voice('en-US'), voice('de-DE')])).toBeUndefined();
  });
});

describe('browser speech', () => {
  it('is ready with a Dutch voice, and speaks Dutch text with it', async () => {
    const { synth, said } = fakeSynth([voice('en-US'), voice('nl-NL', 'Xander')]);
    const speech = createBrowserSpeech(synth, utterance);

    expect(await speech.ready()).toBe(true);
    speech.speak('de hond');

    expect(said).toHaveLength(1);
    expect(said[0]).toMatchObject({ text: 'de hond', lang: 'nl-NL', voice: { name: 'Xander' } });
  });

  it('waits for voices that are listed late', async () => {
    const { synth, arrive } = fakeSynth([]);
    const speech = createBrowserSpeech(synth, utterance);

    const ready = speech.ready();
    arrive([voice('nl-NL')]);

    expect(await ready).toBe(true);
  });

  it('keeps looking when voices arrive in batches and the Dutch one comes later', async () => {
    const { synth, arrive } = fakeSynth([voice('en-US')]);
    const speech = createBrowserSpeech(synth, utterance);

    const ready = speech.ready();
    arrive([voice('en-US'), voice('en-GB')]);
    arrive([voice('en-US'), voice('en-GB'), voice('nl-NL')]);

    expect(await ready).toBe(true);
  });

  it('reports unavailable without a Dutch voice, and then stays silent', async () => {
    vi.useFakeTimers();
    try {
      const { synth, said } = fakeSynth([voice('en-US')]);
      const speech = createBrowserSpeech(synth, utterance);
      const ready = speech.ready();
      vi.advanceTimersByTime(2000);

      expect(await ready).toBe(false);
      speech.speak('de hond');
      speech.unlock();
      expect(said).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('unlocks speech for iOS with one silent utterance, only until something has been said', async () => {
    const { synth, said } = fakeSynth([voice('nl-NL')]);
    const speech = createBrowserSpeech(synth, utterance);
    await speech.ready();

    speech.unlock();
    speech.unlock();
    speech.speak('de hond');
    speech.unlock();

    expect(said.map((u) => [u.text, u.volume])).toEqual([
      [' ', 0],
      ['de hond', undefined],
    ]);
  });

  it('reports unavailable when the browser has no speech at all', async () => {
    expect(await createBrowserSpeech(undefined).ready()).toBe(false);
  });

  it('gives up waiting when no voices are ever listed', async () => {
    vi.useFakeTimers();
    try {
      const { synth } = fakeSynth([]);
      const ready = createBrowserSpeech(synth, utterance).ready();
      vi.advanceTimersByTime(2000);
      expect(await ready).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
