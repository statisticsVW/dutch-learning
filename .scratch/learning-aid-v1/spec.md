# Spec: Dutch Learning Aid v1

Status: ready-for-agent

## Problem Statement

A curious 13-year-old decided, on his own, to teach himself Dutch from scratch. He practises in Bursts — whenever he feels like it, with long and irregular gaps — on an iPhone. Mainstream apps lean on daily streaks, points and guilt, which the research (`docs/research/teen-dutch-learning.md`) shows undermine intrinsic motivation and cause drop-off when a streak breaks. His Curator (an adult relative who does not need to speak Dutch) wants to give him something that feeds his curiosity, respects his irregular schedule, teaches correct Dutch (including de/het), is trivially shareable, and can be corrected or extended without touching code.

## Solution

A small, polished, installable web app the Curator shares as a single link. On first open in Safari it walks the Learner through adding it to his Home Screen (so iOS does not wipe his progress — see ADR 0001), and lets him name the app and pick a colour theme. Each Burst opens on a free-choice home screen: explore a Pack, pick up new Cards, review Cards that are fading, or search the Dictionary and add words to his own Pack, Mijn woorden. Practice mixes recognising, listening to and typing Dutch, gets harder as a Card strengthens, grades itself from his answers, and is scheduled with spaced repetition so that coming back after two weeks surfaces exactly what he has forgotten — with a guilt-free welcome back. Cognates, False friends and Facts make Dutch feel discoverable. Progress lives only on his device, with an export/import backup. He can send the Curator a Word request or Mistake report through the iPhone share sheet. The Curator edits one readable file per Pack on GitHub; an automated check validates it and redeploys.

## User Stories

### Getting started

1. As a Curator, I want to share the aid as one link, so that the Learner can start without an app store or an account.
2. As a Learner, I want the link to open quickly on my iPhone, so that my first impression is good.
3. As a Learner opening the link in Safari for the first time, I want a friendly one-time screen explaining how to add the app to my Home Screen and why ("so your progress doesn't vanish"), so that I don't lose my progress.
4. As a Learner who skipped installing, I want a small, non-blocking reminder to keep showing while I'm in a browser tab, so that I can install it later.
5. As a Learner using the installed app, I want the install reminder to disappear, so that it doesn't nag me.
6. As a Learner, I want to be able to use the app even before I install it, so that I'm not blocked on day one.
7. As a Learner, I want to name the app on first launch, so that it feels like mine.
8. As a Learner, I want to pick a colour theme on first launch, so that it looks the way I like.
9. As a Learner, I want to change the name and theme later, so that I'm not stuck with my first choice.
10. As a Learner, I want the app to work offline after my first visit, so that I can practise anywhere.

### A Burst

11. As a Learner, I want the app to open on a home screen where I choose what to do, so that I follow my own curiosity.
12. As a Learner, I want to see how many Cards are fading and roughly how long reviewing them takes, so that I can decide whether to review.
13. As a Learner, I want reviewing to be optional, so that I never have to do a chore before the fun part.
14. As a Learner returning after a long gap, I want a friendly "welcome back" with no guilt, so that I feel good about coming back.
15. As a Learner returning after a long gap, I want reviews ordered so the most useful ones come first, so that a short Burst still helps.
16. As a Learner, I want to stop at any moment without losing what I did, so that Bursts can be as short as I like.
17. As a Learner, I want new Cards introduced five at a time, so that I'm not overwhelmed.
18. As a Learner, I want to choose "more" after each group of five, up to about fifteen new Cards in a Burst, so that I control the pace without creating a review pile.

### Packs and Cards

19. As a Learner, I want to browse the Packs (Hello & being polite, Numbers, Food, Animals, Family & people, Everyday verbs, Gamen, Tekenen & kunst), so that I can pick a theme I care about.
20. As a Learner, I want a Pack about games, so that I learn words from something I love.
21. As a Learner, I want a Pack about drawing and art, so that I learn words from something I love.
22. As a Learner, I want to see each Pack's progress as a ring (Cards learned out of Cards in the Pack), so that I can see I'm getting somewhere.
23. As a Learner, I want every noun Card to show its article (de or het), so that I learn the article with the word from the start.
24. As a Learner, I want to hear any Card spoken in Dutch, so that I learn how it sounds.
25. As a Learner whose device has no Dutch voice, I want a quiet "audio unavailable" note rather than silence or an error, so that I understand what's going on.
26. As a Learner, I want Cognates highlighted ("you already know this one!"), so that I get easy early wins.
27. As a Learner, I want False friends clearly flagged, so that I don't fall into the trap.
28. As a Learner, I want short Facts about Dutch language and culture on some Cards and Packs, so that learning feels like discovery.

### Practice

29. As a Learner, I want to see a Dutch word and pick its English meaning from choices, so that new words are easy to start with.
30. As a Learner, I want to hear a Dutch word and pick its English meaning, so that I train my ear.
31. As a Learner, I want to see an English meaning and type the Dutch, so that I really remember words I know well.
32. As a Learner, I want practice to get harder as a Card gets stronger, so that it stays challenging but fair.
33. As a Learner, I want typed answers to ignore capitals and accents, so that I'm not punished for keyboard details.
34. As a Learner, I want a typed answer with the right word but the wrong article to count as "almost" and show the right article, so that I learn de/het without feeling I failed.
35. As a Learner, I want to see the correct answer straight after a wrong one, so that I learn from it.
36. As a Learner, I want the app to judge my answers itself, with no rating buttons, so that I just answer and move on.
37. As a Learner, I want words I find easy to come back less often and words I struggle with to come back sooner, so that my time is well spent.

### Dictionary and Mijn woorden

38. As a Learner, I want to search the Dictionary by English or Dutch, so that I can find words I'm curious about.
39. As a Learner, I want to add a Dictionary word to Mijn woorden, so that I can learn words I chose myself.
40. As a Learner, I want words in Mijn woorden to work exactly like any other Card (article, audio, practice, scheduling), so that my own words are first-class.
41. As a Learner, I want to remove a word from Mijn woorden, so that I can tidy it up.
42. As a Learner, I want to be told kindly when a word isn't in the Dictionary yet, so that a miss doesn't feel like a dead end.
43. As a Learner, I want to send the Curator a Word request for a missing word, so that it can be added.

### Talking to the Curator

44. As a Learner, I want to send a Mistake report about a Card or Fact that looks wrong, so that it gets fixed.
45. As a Learner, I want Word requests and Mistake reports to open my iPhone share sheet with the message already written, so that I can send it however we usually talk.
46. As a Curator, I want Word requests and Mistake reports to say exactly which word or Card they are about, so that I can act on them without asking questions.
47. As a Curator, I want none of my contact details in the public site, so that my privacy is protected.

### Progress and backup

48. As a Learner, I want one headline number, "You know N Dutch words", so that I can see how far I've come.
49. As a Learner, I want no streaks, XP or leaderboards, so that I never feel punished for taking a break.
50. As a Learner, I want my progress saved automatically on my phone, so that I never have to think about saving.
51. As a Learner, I want to export my progress as a backup, so that I don't lose it if my phone is reset or replaced.
52. As a Learner, I want to import a backup, so that I can restore my progress on a new device.
53. As a Learner importing a damaged or wrong file, I want a clear message and my current progress left untouched, so that a mistake can't wipe me out.
54. As a Learner, I want my progress to survive the Curator updating the content, so that a new version never resets me.
55. As a Learner, I want my progress on a Card the Curator corrected to carry over, so that a typo fix doesn't make me relearn the word.

### Curating content

56. As a Curator, I want each Pack to be one readable text file in the repository, so that I can edit it in GitHub's web editor without touching code.
57. As a Curator, I want every change to be checked automatically, so that a typo can't break the site.
58. As a Curator, I want a clear, plain-language list of what's wrong when a check fails, so that I can fix it myself.
59. As a Curator, I want each noun's article checked against Wiktionary, with mismatches flagged, so that the aid never teaches a wrong de/het.
60. As a Curator, I want the site to redeploy automatically after a passing change, so that the Learner gets fixes without doing anything.
61. As a Curator, I want to add a new Pack by adding a new file, so that extending the aid is easy.
62. As a Curator, I want to add Cognate, False-friend and Fact notes in the same Pack file, so that all of a Pack's content is in one place.
63. As a Curator, I want the source credits (NT2Lex, Wiktionary, Tatoeba) shown in the app, so that licence terms are met.

## Implementation Decisions

- **Platform**: Vite + TypeScript + Preact single-page app, installable as a Home Screen web app with a web app manifest and a service worker for offline use. Deployed to GitHub Pages from a public repository by a GitHub Action.
- **No backend, no accounts** (ADR 0001). All Learner state lives in on-device storage. Export/import is the only backup.
- **Learning engine** — the central deep module, pure TypeScript with no DOM, storage or audio dependencies. Its interface is small and expressed in the glossary's terms:
  - Created from the validated content, the Learner's saved progress, and a clock.
  - Reports what a Burst offers: fading-Card count and estimated minutes, Packs with progress (learned / total), the "words you know" total, and whether to show a welcome back (gap since last Burst above a threshold).
  - Produces the next prompt for a chosen activity (review fading Cards, new Cards from a Pack, Mijn woorden), including the practice mode (recognise / listen / recall) and, for multiple-choice modes, the distractor options.
  - Accepts an answer and returns the verdict (correct / almost / wrong), the correct answer to display, and updated progress.
  - Adds and removes Dictionary entries from Mijn woorden.
  - Serialises progress to an export and parses an import, rejecting invalid imports without changing state.
- **Scheduling**: FSRS via the MIT-licensed `ts-fsrs` library, desired retention ≈ 0.9. FSRS is an implementation detail behind the engine's interface. Grading is automatic: wrong → Again, correct → Good, fast correct typed recall → Easy. Hard is not used.
- **Mode progression**: new and weak Cards use recognise and listen (multiple choice); Cards past a stability threshold use typed recall.
- **Answer checking**: case- and diacritic-insensitive; trims whitespace; for nouns, the correct word with the wrong or missing article is "almost" (graded as Again for scheduling but shown kindly with the correct article).
- **New-Card pacing**: groups of 5, offering "more" after each, capped at 15 new Cards per Burst.
- **Progress keyed by stable Card ids**, not by the Dutch text, so Curator corrections keep the Learner's progress. Card ids are defined in the Pack files and must be unique across all content. Progress for ids that no longer exist is kept but ignored.
- **Progress storage format is versioned**, so future versions can migrate saved progress and import older backups.
- **Content format**: one YAML file per Pack holding the Pack's title, optional Facts, and its Cards. Each Card has an id, Dutch text, English meaning(s), part of speech, an article for nouns, and optional Cognate / False-friend flag and Fact.
- **Dictionary**: a bundled data file of a few thousand common words built from Wiktionary (with articles) and filtered by NT2Lex frequency/level. Searchable by English or Dutch. A Dictionary entry becomes a Card only when added to Mijn woorden.
- **Content check** — a build-time module that turns the Pack files and Dictionary into validated content or a plain-language error list. Rules include: valid structure, unique ids, articles present on all nouns and only de/het, no duplicate Cards within a Pack, and article agreement with a committed Wiktionary snapshot (mismatches fail the build with the conflicting values shown). The Action runs it on every push; a failure blocks deployment.
- **Content drafting**: initial Pack and Dictionary content is drafted from NT2Lex (selection, CEFR A1), Wiktionary (meanings, articles) and Tatoeba (example sentences where used), with credits shown on an About screen.
- **Browser adapters** — each browser capability sits behind a small interface with a real implementation and an in-memory fake:
  - Progress store (on-device storage).
  - Speech (Web Speech `speechSynthesis` with an nl-NL voice; reports "unavailable" when no Dutch voice exists).
  - Share (Web Share API; prepares Word request and Mistake report text naming the word or Card id).
  - Install status (detects running as an installed Home Screen app vs a Safari tab).
  - Clock.
- **Learner personalisation** (app name and colour theme) is stored on the device only, never in the repository.
- **Privacy rule**: nothing personal in the public repository (see CLAUDE.md).

## Testing Decisions

- Good tests exercise external behaviour through a module's public interface and would survive a rewrite of its internals. No tests of FSRS internals, private helpers, or component markup details.
- **Learning engine** (primary seam, most tests): driven entirely through its interface with fixture content, saved-progress fixtures and a fake clock. Covers what a Burst offers, welcome back after a gap, review ordering, new-Card pacing (5s, cap 15), mode progression, answer verdicts (case/diacritics, "almost" for articles), scheduling outcomes observable via due dates, Mijn woorden, progress surviving content changes by id, and export/import round-trip plus rejection of bad imports.
- **Content check** (build-time seam): fed small fixture Pack files and a fixture Wiktionary snapshot; asserts valid content or the expected plain-language errors.
- **UI flows** (light): a handful of Testing Library tests rendering the app with fake adapters: first-launch name/theme and Home Screen screen, completing a short Burst, Dictionary search and add to Mijn woorden, Word request calling the share adapter, audio-unavailable note.
- Test runner: Vitest. No prior art exists; this is a greenfield repo, so these tests set the pattern.

## Out of Scope

- Mini-stories (first candidate after v1).
- Speaking practice / speech recognition.
- Pre-recorded audio files.
- Any progress view or dashboard for the Curator.
- Accounts, sync, or any backend.
- Streaks, XP, points, badges and leaderboards.
- Flemish (nl-BE) variants.
- Android-specific polish (it should work, but iOS Safari is the target).
- Grammar lessons beyond short Facts (e.g. explicit word-order drills) — candidate for later.

## Further Notes

- Glossary: `CONTEXT.md`. Decision record: `docs/adr/0001-no-accounts-progress-on-device.md`. Research backing the no-streaks, automatic-grading and spacing decisions: `docs/research/teen-dutch-learning.md` (some sources there are marked as not fully verified).
- NT2Lex is CC BY-NC-SA: acceptable because this is a personal, non-commercial project; share-alike is satisfied by the public repository. Wiktionary is CC BY-SA, Tatoeba CC BY.
- The folder is not yet a git repository and no GitHub repository exists; creating them is part of the first ticket.
