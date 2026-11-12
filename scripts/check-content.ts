// Run with `npm run check:content`. Prints a plain-language list of problems in the Pack files.
import { checkContent, formatErrors } from '../src/content/check.ts';
import { readPackFiles } from './read-pack-files.ts';

const result = checkContent(readPackFiles());
if (result.ok) {
  const cards = result.packs.reduce((n, p) => n + p.cards.length, 0);
  console.log(`Content check passed: ${result.packs.length} Pack(s), ${cards} Card(s).`);
} else {
  console.error(formatErrors(result.errors));
  process.exit(1);
}
