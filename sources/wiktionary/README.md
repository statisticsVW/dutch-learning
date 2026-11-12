# Wiktionary senses

`dutch-senses.json` lists, for each word NT2Lex finds at A1 or A2, the current Dutch senses English
Wiktionary gives it, by part of speech, and for nouns the article (de/het) of the noun each sense
belongs to. `npm run build:dictionary` turns these into the Dictionary's English meanings.

## Where it came from

The build script reads each word's page through the public MediaWiki API of
[English Wiktionary](https://en.wiktionary.org) (`action=query&prop=revisions`, 50 pages per
request, pausing between requests) and keeps only the Dutch section's senses. Obsolete, archaic,
dated and regional senses, senses that only point at another word ("plural of …"), and senses
labelled vulgar, offensive or similar are left out. The date it was read is in the file's
`retrieved` field. Words already in the file are not read again; delete the file to refresh it.

The parsing is in `scripts/wiktionary-senses.ts` (tested in `scripts/dictionary-sources.test.ts`).

## Licence

From [English Wiktionary](https://en.wiktionary.org), by Wiktionary contributors, licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). `dutch-senses.json` is a derived
work and is shared under the same licence.
