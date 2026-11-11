# 05: Typed recall with forgiving checks

Spec: `.scratch/learning-aid-v1/spec.md`. Glossary: `CONTEXT.md`.

**What to build:** As a Card grows stronger (past a stability threshold), practice moves it to typed recall: see the English, type the Dutch. Checking is forgiving: case, accents/diacritics and surrounding whitespace are ignored. For a noun, the right word with a wrong or missing article is "almost": it's shown kindly with the correct article and scheduled as Again. A fast, correct typed answer is graded Easy. After any answer that isn't fully correct, the correct answer is shown.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Engine tests: mode progression from multiple choice to typed recall by stability
- [ ] Engine tests: case, diacritic and whitespace insensitivity
- [ ] Engine tests: "almost" for a wrong or missing article, scheduled as Again
- [ ] Engine tests: fast correct answer graded Easy (answer time from the fake clock)
- [ ] UI flow test: typing "het appel" for "de appel" shows "almost" and the correct article
- [ ] The answer field is comfortable on the iPhone keyboard (autocorrect and auto-capitalise off)
