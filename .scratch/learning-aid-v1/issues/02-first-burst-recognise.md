# 02: First Burst: learn new Cards by recognising them

Spec: `.scratch/learning-aid-v1/spec.md`. Glossary: `CONTEXT.md`.

**What to build:** The Learner picks a Pack and learns new Cards: they come in groups of 5, with an offer of "more" after each group, capped at 15 new Cards per Burst. Each prompt is multiple-choice recognise (see the Dutch, pick the English, with sensible distractors). The app grades itself (wrong → Again, correct → Good) and schedules the Card with FSRS (`ts-fsrs`, desired retention ≈ 0.9). Progress is saved automatically on the device, keyed by stable Card id, and survives a reload and a content update. Each Pack shows a progress ring (learned / total) and the home screen shows "You know N Dutch words".

This ticket establishes the learning engine as a pure module with a small interface (built from content + saved progress + clock; what the Burst offers; next prompt; answer → verdict + updated progress), plus the progress-store and clock adapters with in-memory fakes.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Engine tests (fake clock, fixture content) cover groups of 5, "more", and the cap of 15 per Burst
- [x] Engine tests cover correct/wrong verdicts and that due dates move accordingly
- [x] Engine tests cover progress keyed by Card id surviving a change to that Card's text; progress for removed ids is ignored without error
- [x] Engine tests cover Pack progress and "words you know" totals
- [x] Stopping mid-Burst loses nothing (progress persisted after each answer)
- [x] UI flow test: pick a Pack, answer a group of 5, see the progress ring move
- [ ] Works on the live URL on an iPhone
