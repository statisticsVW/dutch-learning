# 06: Home Screen install and offline

Spec: `.scratch/learning-aid-v1/spec.md`. ADR: 0001.

**What to build:** The app is installable to the iPhone Home Screen (web app manifest, icons) and works offline after the first visit (service worker). An install-status adapter detects whether it's running as an installed app or in a Safari tab. On the first visit in a Safari tab, a friendly one-time screen explains how to add it to the Home Screen (Share → Add to Home Screen) and why ("so your progress doesn't vanish"), and lets the Learner continue anyway. While running in a tab, a small non-blocking reminder stays visible; it disappears when running installed.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Install-status adapter with a real implementation and a fake
- [ ] UI flow tests: first visit in a tab shows the install screen once; continuing is possible; the reminder shows in a tab; nothing shows when installed
- [ ] The app loads with no network after a first visit
- [ ] Manually verified: added to an iPhone Home Screen, it opens full-screen with the right icon and name
