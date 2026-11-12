import { describe, expect, it } from 'vitest';
import { nounMeaningsByArticle } from './wiktionary-senses.ts';

// Trimmed from real English Wiktionary pages (CC BY-SA 4.0, Wiktionary contributors).
const appel = `==Dutch==
===Etymology 1===
====Noun====
{{nl-noun|m|-s,-@en|+}}
# {{C|nl|Fruits|Pome fruits}} [[apple]] {{gloss|{{taxfmt|Malus domestica|species}}, fruit or tree}}
# {{C|nl|Myrtle family plants}} {{lb|nl|Suriname}} [[wax apple]] {{gloss|{{taxfmt|Syzygium samarangense|species}}}}
=====Derived terms=====
* {{l|nl|appelboom}}
===Etymology 2===
====Noun====
{{nl-noun|n|-s|++}}
# [[appeal]] {{gloss|act of imploring or exhorting}}
#: {{ux|nl|Een appel doen.}}
# {{lb|nl|military}} [[roll call|roll-call]]
===Anagrams===

==Limburgish==
===Noun===
{{nl-noun|n}}
# not Dutch
`;

const hond = `==Dutch==
===Etymology 1===
====Noun====
{{nl-noun|m|-en|+}}
# [[dog]]
===Etymology 2===
====Noun====
{{nl-noun|n|-en|+}}
# {{lb|nl|obsolete}} an old unit of area
`;

describe('nounMeaningsByArticle', () => {
  it('collects the English meanings of each Dutch noun heading under its article', () => {
    expect(nounMeaningsByArticle(appel)).toEqual({
      de: ['apple (fruit or tree)'],
      het: ['appeal (act of imploring or exhorting)', 'roll-call'],
    });
  });

  it('ignores obsolete, archaic and regional senses', () => {
    expect(nounMeaningsByArticle(hond)).toEqual({ de: ['dog'], het: [] });
  });

  it('gives a noun with two genders on one heading the same meanings under both articles', () => {
    expect(nounMeaningsByArticle('==Dutch==\n====Noun====\n{{nl-noun|f,n|-en|+}}\n# a {{l|en|school}}\n')).toEqual({
      de: ['a school'],
      het: ['a school'],
    });
  });
});
