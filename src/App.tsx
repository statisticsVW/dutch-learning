import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Pack } from './content/types';
import { createEngine, type FadingSummary } from './engine/engine';
import type { Clock } from './adapters/clock';
import type { ProgressStore } from './adapters/progress-store';
import { PackList } from './PackList';
import { Practice, type Activity } from './Practice';

type Props = { packs: Pack[]; store: ProgressStore; clock: Clock; random?: () => number };

/** Away from the app for at least this long, coming back starts a new Burst. */
export const NEW_BURST_AFTER_MINUTES = 30;

export function App({ packs, store, clock, random }: Props) {
  const [burst, setBurst] = useState(0);
  // One engine per Burst: opening the app (or coming back to it after a while) starts a Burst.
  const engine = useMemo(() => createEngine({ packs, progress: store.load(), clock, random }), [packs, store, clock, random, burst]);
  const [activity, setActivity] = useState<Activity | undefined>();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [, rerender] = useState(0);

  useBackFromBackground(clock, () => {
    setActivity(undefined);
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

  const { wordsKnown, fading, welcomeBack, packs: summaries } = engine.overview();
  return (
    <main>
      <h1>Dutch</h1>
      {welcomeBack && !welcomeDismissed && (
        <p class="welcome-back" role="status">
          Welcome back! Good to see you. Pick anything you like.
        </p>
      )}
      <p class="words-known">You know {plural(wordsKnown, 'Dutch word', 'Dutch words')}</p>
      {fading.count > 0 && <ReviewOffer fading={fading} onReview={() => begin({ kind: 'review' })} />}
      <PackList packs={summaries} onPick={(packId) => begin({ kind: 'new', packId })} />
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
