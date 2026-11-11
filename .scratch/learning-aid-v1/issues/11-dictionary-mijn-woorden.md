# 11: Dictionary search and Mijn woorden

Spec: `.scratch/learning-aid-v1/spec.md`. Glossary: `CONTEXT.md`.

**What to build:** The Learner can search a bundled Dictionary by English or Dutch and add an entry to Mijn woorden, his own Pack. A Dictionary entry becomes a Card only when added; Cards in Mijn woorden practise, speak and schedule exactly like any other Card (including articles), and can be removed. When a search finds nothing, a kind "not in my dictionary yet" message appears. Use a small Dictionary data file for this ticket (the full one arrives in 13), validated by the content check.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Engine tests: add/remove Mijn woorden; added Cards are offered and scheduled like Pack Cards; progress survives removing and re-adding
- [ ] Search tests: English and Dutch queries, case/accent-insensitive, sensible ranking
- [ ] UI flow test: search, add, then see the Card in Mijn woorden and practise it
- [ ] UI flow test: an unknown word shows the kind message
