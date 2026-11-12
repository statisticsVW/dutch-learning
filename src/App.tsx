import { useCallback, useMemo, useState } from 'preact/hooks';
import type { DictionaryEntry, Pack } from './content/types';
import { createEngine } from './engine/engine';
import type { Clock } from './adapters/clock';
import type { ProgressStore } from './adapters/progress-store';
import type { MyWordsStore } from './adapters/my-words-store';
import { PackList } from './PackList';
import { Practice } from './Practice';
import { DictionaryScreen } from './dictionary/DictionaryScreen';
import { withMyWords } from './dictionary/my-words';

/** The Dictionary (loaded lazily) and the Learner's Mijn woorden. */
export type DictionaryDeps = { load: () => Promise<DictionaryEntry[]>; myWords: MyWordsStore };

type Props = { packs: Pack[]; store: ProgressStore; clock: Clock; random?: () => number; dictionary?: DictionaryDeps };

export function App({ packs, store, clock, random, dictionary }: Props) {
  const [myWords, setMyWords] = useState(() => dictionary?.myWords.load() ?? []);
  const allPacks = useMemo(() => withMyWords(packs, myWords), [packs, myWords]);
  // One engine per Burst: opening the app starts a Burst. (Changing Mijn woorden starts a fresh engine.)
  const engine = useMemo(() => createEngine({ packs: allPacks, progress: store.load(), clock, random }), [allPacks, store, clock, random]);
  const [packId, setPackId] = useState<string | undefined>();
  const [showDictionary, setShowDictionary] = useState(false);
  const [, rerender] = useState(0);

  const start = (id: string) => {
    engine.startNewCards(id);
    setPackId(id);
    rerender((n) => n + 1);
  };
  const changeMyWords = useCallback(
    (words: DictionaryEntry[]) => {
      dictionary?.myWords.save(words);
      setMyWords(words);
    },
    [dictionary],
  );

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

  if (dictionary && showDictionary) {
    return (
      <main>
        <DictionaryScreen load={dictionary.load} words={myWords} onChange={changeMyWords} onBack={() => setShowDictionary(false)} />
      </main>
    );
  }

  const { wordsKnown, packs: summaries } = engine.overview();
  return (
    <main>
      <h1>Dutch</h1>
      <p class="words-known">
        You know {wordsKnown} Dutch {wordsKnown === 1 ? 'word' : 'words'}
      </p>
      <PackList packs={summaries} onPick={start} />
      {dictionary && (
        <button class="dictionary-button" onClick={() => setShowDictionary(true)}>
          Search the Dictionary
        </button>
      )}
    </main>
  );
}
