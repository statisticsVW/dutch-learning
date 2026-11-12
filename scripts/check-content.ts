// Run with `npm run check:content`. Prints a plain-language list of problems in the Pack files and the Dictionary.
import { checkContent, checkDictionary, formatErrors } from '../src/content/check.ts';
import { readArticleSnapshot, readDictionaryFile, readPackFiles } from './read-content.ts';

const wiktionary = readArticleSnapshot();
const result = checkContent(readPackFiles(), wiktionary);
if (!result.ok) {
  console.error(formatErrors(result.errors));
  process.exit(1);
}
const dictionary = checkDictionary(readDictionaryFile(), wiktionary, result.packs);
if (!dictionary.ok) {
  console.error(formatErrors(dictionary.errors));
  process.exit(1);
}
const cards = result.packs.reduce((n, p) => n + p.cards.length, 0);
console.log(`Content check passed: ${result.packs.length} Pack(s), ${cards} Card(s), ${dictionary.entries.length} Dictionary entries.`);
