# Dictionary

`dictionary.yaml` is the Dictionary the Learner can search in the app. An entry is not a Card until
he adds it to Mijn woorden. Each entry has the same fields as a Card (`id`, `dutch`, `english`,
`pos`, and `article` for nouns), and `npm run check:content` checks it with the same rules. Entry
ids must be unique across the Dictionary and every Pack, and must never change: the Learner's
progress on a word he added is kept under its id.

This is a small starter set of about 100 common words. Ticket 13 replaces it with the full
Dictionary (a few thousand words). The app loads the Dictionary separately from the rest of the
app, only when the Learner opens the Dictionary screen, so a bigger file does not slow down start-up.

## Sources and licence

The words and English meanings were written for this project. Every noun's article is checked
against the Wiktionary snapshot in `content/wiktionary/articles.json`, which comes from
[English Wiktionary](https://en.wiktionary.org) (Wiktionary contributors,
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)). Because of that, `dictionary.yaml`
is also shared under CC BY-SA 4.0.
