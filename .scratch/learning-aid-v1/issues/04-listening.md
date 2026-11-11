# 04: Listening: hear Cards in Dutch

Spec: `.scratch/learning-aid-v1/spec.md`. Glossary: `CONTEXT.md`.

**What to build:** The Learner can tap to hear any Card spoken in Dutch, and practice adds a listen mode (hear the Dutch, pick the English) for new and weak Cards alongside recognise. Speech goes through a speech adapter using the browser's speech synthesis with an nl-NL voice. If no Dutch voice exists, the app shows a quiet "audio unavailable" note, and the engine is told so it doesn't choose listen mode.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Speech adapter interface with a real implementation and an in-memory fake
- [ ] Engine tests: listen mode is offered for new/weak Cards only when audio is available
- [ ] UI flow test: with a fake "no Dutch voice", the note appears and no listen prompts occur
- [ ] Manually verified on iPhone Safari that the built-in Dutch voice speaks Cards
