# 10: Cognates, False friends and Facts

Spec: `.scratch/learning-aid-v1/spec.md`. Glossary: `CONTEXT.md`.

**What to build:** The Pack file format gains optional notes: a Card can be flagged as a Cognate or a False friend (with what it really means versus what it looks like), and Cards and Packs can carry Facts. In the app, Cognates show a "you already know this one!" moment, False friends show a clear warning, and Facts appear as short "did you know" notes on the Card or Pack. The content check validates the new fields.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Content-check tests for valid and invalid note fields
- [ ] UI flow tests: a Cognate, a False friend and a Fact each display as intended
- [ ] Sample Pack updated with at least one of each
