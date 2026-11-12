import { useMemo, useState } from 'preact/hooks';
import type { Pack } from './content/types';
import { createEngine } from './engine/engine';
import type { Clock } from './adapters/clock';
import type { ProgressStore } from './adapters/progress-store';
import { PackList } from './PackList';
import { Practice } from './Practice';

type Props = { packs: Pack[]; store: ProgressStore; clock: Clock; random?: () => number };

export function App({ packs, store, clock, random }: Props) {
  // One engine per Burst: opening the app starts a Burst.
  const engine = useMemo(() => createEngine({ packs, progress: store.load(), clock, random }), [packs, store, clock, random]);
  const [packId, setPackId] = useState<string | undefined>();
  const [, rerender] = useState(0);

  const start = (id: string) => {
    engine.startNewCards(id);
    setPackId(id);
    rerender((n) => n + 1);
  };

  if (packId) {
    return (
      <main>
        <Practice
          engine={engine}
          onAnswered={(result) => store.save(result.progress)}
          onMore={() => start(packId)}
          onDone={() => setPackId(undefined)}
        />
      </main>
    );
  }

  const { wordsKnown, packs: summaries } = engine.overview();
  return (
    <main>
      <p class="words-known">
        You know {wordsKnown} Dutch {wordsKnown === 1 ? 'word' : 'words'}
      </p>
      <PackList packs={summaries} onPick={start} />
    </main>
  );
}
