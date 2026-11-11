# 07: Make it his: name and colour theme

Spec: `.scratch/learning-aid-v1/spec.md`. Privacy rule: CLAUDE.md.

**What to build:** On first launch (after the install screen from 06), the Learner names the app and picks a colour theme from a small set. The chosen name appears in the app's header and the theme applies throughout. Both can be changed later from a settings screen. Both are stored on the device only, never in the repository.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] UI flow test: first launch asks for name and theme, then never again
- [ ] UI flow test: changing name/theme in settings updates the app
- [ ] Choices persist across reloads via the progress-store adapter
- [ ] Every theme is readable (sufficient contrast) on a phone
