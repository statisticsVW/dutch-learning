// Speaking Dutch aloud, through the browser's built-in speech synthesis (iOS has a Dutch voice).

/** Speaks Dutch text aloud. */
export type Speak = (dutch: string) => void;

export type Speech = {
  /** Resolves to whether this device has a Dutch voice. Browsers may list voices a moment after load. */
  ready(): Promise<boolean>;
  /** Speaks Dutch text; does nothing when there is no Dutch voice. */
  speak: Speak;
  /**
   * Call from a tap. iOS only lets a page start speech from a tap until it has spoken once,
   * so this says nothing, from the tap, to let later prompts play by themselves.
   */
  unlock(): void;
};

/** The part of the browser's `speechSynthesis` this adapter uses. */
export type SpeechSynthesisLike = Pick<SpeechSynthesis, 'getVoices' | 'speak' | 'cancel' | 'speaking' | 'addEventListener' | 'removeEventListener'>;
type VoiceLike = Pick<SpeechSynthesisVoice, 'lang'>;

/** How long to wait for the browser to list its voices before deciding there is no Dutch one. */
const VOICES_WAIT_MS = 2000;
const SPEAKING_RATE = 0.9;

export function createBrowserSpeech(
  synth: SpeechSynthesisLike | undefined,
  makeUtterance: (text: string) => SpeechSynthesisUtterance = (text) => new SpeechSynthesisUtterance(text),
): Speech {
  let voice: SpeechSynthesisVoice | undefined;
  let readiness: Promise<boolean> | undefined;
  let unlocked = false;

  const findVoice = () => {
    voice = synth ? pickDutchVoice(synth.getVoices()) : undefined;
    return voice !== undefined;
  };

  return {
    ready() {
      readiness ??= new Promise<boolean>((resolve) => {
        if (!synth) return resolve(false);
        if (findVoice()) return resolve(true);
        // Voices can arrive late, and in batches: keep looking until a Dutch one shows up or time runs out.
        const finish = (found: boolean) => {
          clearTimeout(timer);
          synth.removeEventListener('voiceschanged', onVoices);
          resolve(found);
        };
        const onVoices = () => {
          if (findVoice()) finish(true);
        };
        const timer = setTimeout(() => finish(findVoice()), VOICES_WAIT_MS);
        synth.addEventListener('voiceschanged', onVoices);
      });
      return readiness;
    },

    speak(dutch) {
      if (!synth || !voice) return;
      if (synth.speaking) synth.cancel(); // a new tap replaces whatever is still being said
      unlocked = true;
      const utterance = makeUtterance(dutch);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = SPEAKING_RATE;
      synth.speak(utterance);
    },

    unlock() {
      if (!synth || !voice || unlocked) return;
      unlocked = true;
      const silence = makeUtterance(' ');
      silence.volume = 0;
      synth.speak(silence);
    },
  };
}

/** Prefers a Netherlands Dutch voice (nl-NL), and falls back to any Dutch one (such as nl-BE). */
export function pickDutchVoice<V extends VoiceLike>(voices: readonly V[]): V | undefined {
  const lang = (v: V) => v.lang.replace('_', '-').toLowerCase();
  return voices.find((v) => lang(v) === 'nl-nl') ?? voices.find((v) => lang(v).startsWith('nl'));
}

export type FakeSpeech = Speech & { spoken: string[]; unlocks: number };

export function createFakeSpeech(available: boolean): FakeSpeech {
  const fake: FakeSpeech = {
    spoken: [],
    unlocks: 0,
    ready: () => Promise.resolve(available),
    speak: (dutch) => {
      if (available) fake.spoken.push(dutch);
    },
    unlock: () => {
      fake.unlocks++;
    },
  };
  return fake;
}
