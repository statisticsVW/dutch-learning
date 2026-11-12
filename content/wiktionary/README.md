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

A word found in both groups (for example *pad*: de pad "toad", het pad "path") allows either article.
The file is written one noun per line, sorted, so a rebuild shows as a readable diff. Commit the
result together with any Pack changes that need it. Rebuilding takes a few minutes, because the
script pauses between requests to stay within Wiktionary's rate limits.
