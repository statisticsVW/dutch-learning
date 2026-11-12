# 07: Make it his: name and colour theme

Spec: `.scratch/learning-aid-v1/spec.md`. Privacy rule: CLAUDE.md.

**What to build:** On first launch (after the install screen from 06), the Learner names the app and picks a colour theme from a small set. The chosen name appears in the app's header and the theme applies throughout. Both can be changed later from a settings screen. Both are stored on the device only, never in the repository.

**Blocked by:** 06

**Status:** done (PR open; the on-phone check below still needs a real iPhone)

- [x] UI flow test: first launch asks for name and theme, then never again
- [x] UI flow test: changing name/theme in settings updates the app
- [x] Choices persist across reloads via the progress-store adapter
- [ ] Every theme is readable (sufficient contrast) on a phone. Contrast is checked automatically (WCAG AA, `src/personalise/themes.test.ts` against the real stylesheet); looking at each theme on a real iPhone is still to do.

**Notes from implementation:**

- Name and theme are kept by a sibling adapter, `src/adapters/personalisation-store.ts`, in the same on-device storage and following the same pattern as the progress store. They are not inside the progress format, because ticket 03 owns that format and ticket 08 exports it as the backup.
- On iOS, a Home Screen app has its own storage, separate from Safari's. If the Learner names the app in Safari and installs it afterwards, the installed app asks him again (his progress does not carry over either).
- The Home Screen icon label is still "Dutch". iOS lets him edit it in the Add to Home Screen sheet. The app also sets the page title to his chosen name, but it hasn't been verified whether iOS picks that up.
