# Dictionary

`dictionary.yaml` is the Dictionary the Learner can search in the app: about 3,000 common Dutch
words. An entry is not a Card until he adds it to Mijn woorden. Each entry has the same fields as a
Card (`id`, `dutch`, `english`, `pos`, and `article` for nouns), and `npm run check:content` checks
it with the same rules. Entry ids must be unique across the Dictionary and every Pack, and must
never change: the Learner's progress on a word he added is kept under its id.

The app loads the Dictionary separately from the rest of the app, only when the Learner opens the
Dictionary screen, so its size does not slow down start-up. (The service worker still saves it on
the phone after the first visit, so it works offline.)

## How it is built

```bash
npm run build:dictionary
```

The script (`scripts/build-dictionary.ts`):

1. picks the words from [NT2Lex](../../sources/nt2lex/README.md): single words that Dutch learner
   texts at CEFR levels A1 and A2 use, most frequent first;
2. takes each word's English meanings from its [English Wiktionary](../../sources/wiktionary/README.md)
   page: all meanings of the first sense, and a short first meaning of later ones, at most three;
3. takes each noun's article from the Wiktionary snapshot the content check uses, and checks the
   whole file with the app build's rules before writing it.

Every entry already in `dictionary.yaml` is kept exactly as it is, so you can fix a meaning by hand
and a rebuild will not undo it. The first 100 entries were written by hand for this project before
the full Dictionary was built. A few crude words NT2Lex lists are left out on purpose (see `LEFT_OUT`
in the script), as are Wiktionary senses labelled vulgar, offensive or similar.

The meanings are picked by a script, so some are odd or too narrow. Fix them here when you notice.

## Sources and licence

- The **words** were chosen with NT2Lex, by Anaïs Tack, Thomas François, Piet Desmet and Cédrick
  Fairon (CENTAL, UCLouvain and ITEC, KU Leuven),
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Only the choice of words
  comes from NT2Lex; none of its frequency figures are in `dictionary.yaml`.
- The **meanings** and **articles** come from [English Wiktionary](https://en.wiktionary.org), by
  Wiktionary contributors, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

`dictionary.yaml` is shared under CC BY-SA 4.0. Because its word list was picked with NT2Lex, keep
it non-commercial too, as NT2Lex's licence asks. Both sources are credited in the app's About screen.
