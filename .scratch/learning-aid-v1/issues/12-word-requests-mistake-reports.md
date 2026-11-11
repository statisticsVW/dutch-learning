# 12: Word requests and Mistake reports via the share sheet

Spec: `.scratch/learning-aid-v1/spec.md`. Glossary: `CONTEXT.md`. Privacy rule: CLAUDE.md.

**What to build:** A share adapter (Web Share API, with a fake) lets the Learner send the Curator messages with no contact details in the site. When a Dictionary search finds nothing, he can send a Word request naming the word he searched for. Every Card and Fact offers a Mistake report naming the Card id and the text that looks wrong. Both open the iPhone share sheet with the message already written. If sharing isn't supported, the message is offered to copy instead.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] UI flow tests: Word request and Mistake report call the share adapter with the expected text (word / Card id included)
- [ ] Falls back to copy-to-clipboard when sharing is unavailable
- [ ] No email address, phone number or other contact detail anywhere in the repository
- [ ] Manually verified that the share sheet opens on iPhone
