# 11: Dictionary search and Mijn woorden

Spec: `.scratch/learning-aid-v1/spec.md`. Glossary: `CONTEXT.md`.

**What to build:** The Learner can search a bundled Dictionary by English or Dutch and add an entry to Mijn woorden, his own Pack. A Dictionary entry becomes a Card only when added; Cards in Mijn woorden practise, speak and schedule exactly like any other Card (including articles), and can be removed. When a search finds nothing, a kind "not in my dictionary yet" message appears. Use a small Dictionary data file for this ticket (the full one arrives in 13), validated by the content check.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Engine tests: add/remove Mijn woorden; added Cards are offered and scheduled like Pack Cards; progress survives removing and re-adding
- [x] Search tests: English and Dutch queries, case/accent-insensitive, sensible ranking
- [x] UI flow test: search, add, then see the Card in Mijn woorden and practise it
- [x] UI flow test: an unknown word shows the kind message

## Comments

- Implemented on branch `claude/11-dictionary-8f4332`. The engine was being reworked by ticket 03 at the same time, so Mijn woorden is kept outside it: `src/dictionary/my-words.ts` turns the added entries into a Pack that is passed to `createEngine`. The "engine tests" drive the real engine with that Pack (`src/dictionary/my-words.test.ts`). The list of words is stored under its own key (`dutch-learning.mijn-woorden`). The progress format is unchanged.
- Follow-ups:
  - Fold add/remove into the engine, as the spec describes. Until then, changing Mijn woorden rebuilds the engine, which resets the 15-new-Cards-per-Burst cap.
  - The export/import backup (ticket 08) must include Mijn woorden.
  - Ticket 13 must check the size of the full Dictionary: the service worker precaches it at install.
