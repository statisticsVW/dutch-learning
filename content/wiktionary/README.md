# Wiktionary article snapshot

`articles.json` lists the article (de/het) that English Wiktionary gives each Dutch noun. The content
check compares every noun Card against it, so the build never needs the network.

## Licence

The data comes from [English Wiktionary](https://en.wiktionary.org), by Wiktionary contributors,
licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). `articles.json` is
a derived work and is shared under the same licence.

## How it is built

```bash
npm run snapshot:wiktionary
```

The script (`scripts/build-article-snapshot.ts`) reads these Wiktionary categories through the
public MediaWiki API:

- Dutch masculine nouns, Dutch feminine nouns, Dutch common-gender nouns → **de**
- Dutch neuter nouns → **het**

About 800 words are in both groups. For those the script reads the word's page and drops senses
labelled obsolete, archaic, dated or regional (het *hond* was an old unit of area, so *hond* is just
**de**). If both articles still have current senses, the entry lists each article's English meanings:

```json
"appel": {"de": ["apple (fruit or tree)"], "het": ["appeal (…)", "roll call"]}
```

The check then fails a Card only when its English clearly matches the other noun, e.g. *appel* /
"apple" / het. If the meaning matches neither, either article is accepted.

Senses are parsed by `scripts/wiktionary-senses.ts` (tested in `wiktionary-senses.test.ts`).

The file is written one noun per line, sorted, so a rebuild shows as a readable diff. Commit the
result together with any Pack changes that need it. Rebuilding takes a few minutes, because the
script pauses between requests to stay within Wiktionary's rate limits.
