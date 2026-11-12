import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { DictionaryEntry, Pack } from './content/types';
import { createEngine, type FadingSummary } from './engine/engine';
import type { Clock } from './adapters/clock';
import type { ProgressStore } from './adapters/progress-store';
import type { MyWordsStore } from './adapters/my-words-store';
import { PackList } from './PackList';
import { Practice, type Activity } from './Practice';
import { DictionaryScreen } from './dictionary/DictionaryScreen';
import { withMyWords } from './dictionary/my-words';

/** The Dictionary (loaded lazily) and the Learner's Mijn woorden. */
export type DictionaryDeps = { load: () => Promise<DictionaryEntry[]>; myWords: MyWordsStore };

type Props = { packs: Pack[]; store: ProgressStore; clock: Clock; random?: () => number; dictionary?: DictionaryDeps };

/** Away from the app for at least this long, coming back starts a new Burst. */
export const NEW_BURST_AFTER_MINUTES = 30;

export function App({ packs, store, clock, random, dictionary }: Props) {
  const [myWords, setMyWords] = useState(() => dictionary?.myWords.load() ?? []);
  const allPacks = useMemo(() => withMyWords(packs, myWords), [packs, myWords]);
  const [burst, setBurst] = useState(0);
  // One engine per Burst: opening the app (or coming back to it after a while) starts a Burst.
  // Changing Mijn woorden also starts a fresh engine.
  const engine = useMemo(() => createEngine({ packs: allPacks, progress: store.load(), clock, random }), [allPacks, store, clock, random, burst]);
  const [activity, setActivity] = useState<Activity | undefined>();
  const [showDictionary, setShowDictionary] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [, rerender] = useState(0);

  useBackFromBackground(clock, () => {
    setActivity(undefined);
    setShowDictionary(false);
    setWelcomeDismissed(false);
    setBurst((n) => n + 1);
  });

  const begin = (next: Activity) => {
    if (next.kind === 'review') engine.startReview();
    else engine.startNewCards(next.packId);
    setActivity(next);
    setWelcomeDismissed(true);
    rerender((n) => n + 1);
  };
  const changeMyWords = useCallback(
    (words: DictionaryEntry[]) => {
      dictionary?.myWords.save(words);
      setMyWords(words);
    },
    [dictionary],
  );

  if (activity) {
    return (
      <main>
        <Practice
          engine={engine}
          activity={activity}
          onAnswered={(result) => store.save(result.progress)}
          onMore={() => begin(activity)}
          onDone={() => setActivity(undefined)}
        />
      </main>
    );
  }

  if (dictionary && showDictionary) {
    return (
      <main>
        <DictionaryScreen load={dictionary.load} words={myWords} onChange={changeMyWords} onBack={() => setShowDictionary(false)} />
      </main>
    );
  }

  const { wordsKnown, fading, welcomeBack, packs: summaries } = engine.overview();
  return (
    <main>
      {welcomeBack && !welcomeDismissed && (
        <p class="welcome-back" role="status">
          Welcome back! Good to see you. Pick anything you like.
        </p>
      )}
      <p class="words-known">You know {plural(wordsKnown, 'Dutch word', 'Dutch words')}</p>
      {fading.count > 0 && <ReviewOffer fading={fading} onReview={() => begin({ kind: 'review' })} />}
      <PackList packs={summaries} onPick={(packId) => begin({ kind: 'new', packId })} />
      {dictionary && (
        <button class="dictionary-button" onClick={() => setShowDictionary(true)}>
          Search the Dictionary
        </button>
      )}
    </main>
  );
}

/** A prominent but optional offer: the Packs stay right below it. */
function ReviewOffer({ fading: { count, minutes }, onReview }: { fading: FadingSummary; onReview: () => void }) {
  return (
    <button class="review-offer" onClick={onReview}>
      <span>Review {plural(count, 'fading Card', 'fading Cards')}</span>
      <span class="review-time">about {plural(minutes, 'minute', 'minutes')}</span>
    </button>
  );
}

/**
 * An installed app is rarely reopened from scratch: iOS brings it back from the background.
 * Calls `onNewBurst` when it comes back after a long time away.
 */
function useBackFromBackground(clock: Clock, onNewBurst: () => void) {
  useEffect(() => {
    let hiddenAt: number | undefined;
    const onChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = clock.now().getTime();
      } else if (hiddenAt !== undefined) {
        const away = clock.now().getTime() - hiddenAt;
        hiddenAt = undefined;
        if (away >= NEW_BURST_AFTER_MINUTES * 60_000) onNewBurst();
      }
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [clock]);
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
