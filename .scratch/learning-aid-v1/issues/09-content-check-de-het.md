# 09: Content check: de/het against Wiktionary

Spec: `.scratch/learning-aid-v1/spec.md`.

**What to build:** The build-time content check grows to the full rule set, so the Curator can safely edit Pack files on GitHub: every noun Card has an article and it is only "de" or "het"; no duplicate Cards within a Pack; Card ids are unique across all content; and every noun's article agrees with a committed Wiktionary snapshot. Errors are plain language and name the Pack file, Card id and the conflicting values (for example: Card food-07 "appel" says het, Wiktionary says de). A failing check blocks deployment. Include a short Curator how-to explaining the Pack file format and how to fix check errors.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Content-check tests with fixture Pack files and a fixture Wiktionary snapshot cover each rule
- [ ] Error messages are plain language and point to the exact Card
- [ ] A repeatable way to (re)build the Wiktionary article snapshot, with its licence noted
- [ ] Curator how-to written in the repository
- [ ] Verified that a deliberately wrong article in a pushed change fails the Action and does not deploy
