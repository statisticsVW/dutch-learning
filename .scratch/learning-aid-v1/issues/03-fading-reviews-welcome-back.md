# 03: Fading reviews and welcome back

Spec: `.scratch/learning-aid-v1/spec.md`. Glossary: `CONTEXT.md`.

**What to build:** The home screen tells the Learner how many Cards are fading and roughly how many minutes reviewing them takes, as a prominent but optional choice (never forced before other activities). A review runs the fading Cards, most useful first, so a short Burst after a long gap still helps. After a gap since the last Burst above a threshold, a friendly, guilt-free "welcome back" appears. No streaks or guilt messaging anywhere.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Engine tests: fading count and minute estimate at different fake-clock times
- [x] Engine tests: review order puts the most useful Cards (most overdue relative to their stability) first
- [x] Engine tests: welcome back shown only after the gap threshold
- [x] The Learner can skip reviewing and go straight to a Pack
- [x] UI flow test: after advancing the fake clock, home shows fading Cards and welcome back
