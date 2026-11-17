import { useEffect, useMemo, useState } from 'preact/hooks';
import type { DictionaryEntry } from '../content/types';
import { addWord, dutchWithArticle, refreshWords, removeWord } from './my-words';
import { searchDictionary } from './search';
import { wordRequest } from '../adapters/share';
import { ShareButton } from '../ShareButton';
import type { Speak } from '../adapters/speech';

type Props = {
  /** Fetches the Dictionary; it is a separate file, loaded only when this screen opens. */
  load: () => Promise<DictionaryEntry[]>;
  words: DictionaryEntry[];
  onChange: (words: DictionaryEntry[]) => void;
  onBack: () => void;
  /** Speaks Dutch; undefined when the device has no Dutch voice. */
  speak?: Speak;
};

type Loaded = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; entries: DictionaryEntry[] };

/** Search the Dictionary by English or Dutch, add words to Mijn woorden, and tidy Mijn woorden up. */
export function DictionaryScreen({ load, words, onChange, onBack, speak }: Props) {
  const [dictionary, setDictionary] = useState<Loaded>({ status: 'loading' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    let current = true;
    load().then(
      (entries) => current && setDictionary({ status: 'ready', entries }),
      () => current && setDictionary({ status: 'failed' }),
    );
    return () => {
      current = false;
    };
  }, [load]);

  // A Curator's correction to a word reaches Mijn woorden once the Dictionary is loaded.
  useEffect(() => {
    if (dictionary.status !== 'ready') return;
    const refreshed = refreshWords(words, dictionary.entries);
    if (refreshed !== words) onChange(refreshed);
  }, [dictionary, words, onChange]);

  const results = useMemo(() => (dictionary.status === 'ready' ? searchDictionary(dictionary.entries, query) : []), [dictionary, query]);
  const added = new Set(words.map((w) => w.id));

  return (
    <section class="dictionary">
      <button class="quiet back" onClick={onBack}>
        Back
      </button>
      <h1>Dictionary</h1>

      {dictionary.status === 'loading' && <p class="muted">Loading the Dictionary…</p>}
      {dictionary.status === 'failed' && <p class="muted">The Dictionary could not be loaded. Check your internet connection and try again.</p>}
      {dictionary.status === 'ready' && (
        <>
          <label class="search">
            Search in English or Dutch
            <input type="search" value={query} autofocus autocomplete="off" autocapitalize="off" spellcheck={false} onInput={(e) => setQuery(e.currentTarget.value)} />
          </label>
          {query.trim() !== '' &&
            (results.length > 0 ? (
              <ul class="word-list" aria-label="Results">
                {results.map((entry) => (
                  <li key={entry.id}>
                    <Word entry={entry} speak={speak} />
                    {added.has(entry.id) ? (
                      <span class="muted">In Mijn woorden</span>
                    ) : (
                      <button aria-label={`Add ${dutchWithArticle(entry)} to Mijn woorden`} onClick={() => onChange(addWord(words, entry))}>
                        Add
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div class="not-found" role="status">
                <p>“{query.trim()}” is not in my dictionary yet.</p>
                <p class="muted">Try another spelling, or a simpler word.</p>
                <ShareButton key={query.trim()} label={`Ask for “${query.trim()}” to be added`} kind="Word request" message={wordRequest(query.trim())} />
              </div>
            ))}
        </>
      )}

      <h2>Mijn woorden</h2>
      {words.length > 0 ? (
        <ul class="word-list" aria-label="Mijn woorden">
          {words.map((entry) => (
            <li key={entry.id}>
              <Word entry={entry} speak={speak} />
              <button class="quiet" aria-label={`Remove ${dutchWithArticle(entry)} from Mijn woorden`} onClick={() => onChange(removeWord(words, entry.id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p class="muted">No words yet. Search the Dictionary and add the ones you want to learn.</p>
      )}
    </section>
  );
}

function Word({ entry, speak }: { entry: DictionaryEntry; speak?: Speak }) {
  const dutch = dutchWithArticle(entry);
  return (
    <span class="word">
      <span class="word-dutch" lang="nl">
        {dutch}
        {speak && (
          <button class="hear hear-small" aria-label={`Hear ${dutch} in Dutch`} onClick={() => speak(dutch)}>
            <span aria-hidden="true">🔊</span>
          </button>
        )}
      </span>
      <span class="word-english">{entry.english.join(', ')}</span>
    </span>
  );
}
