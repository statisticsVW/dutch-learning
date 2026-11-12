# 08: Backup: export and import progress

Spec: `.scratch/learning-aid-v1/spec.md`. ADR: 0001.

**What to build:** The saved progress format carries a version number. The Learner can export his progress as a backup file (via the share sheet / Files on iOS) and import one to restore it, e.g. on a new phone. Importing a damaged, wrong or unknown-version file shows a clear message and leaves current progress untouched. The app name and theme are included in the backup.

**Blocked by:** 02

**Status:** done (pending the iPhone check)

- [x] Engine tests: export → import round-trip restores identical progress
- [x] Engine tests: malformed, wrong-shape and unknown-version imports are rejected without changing state
- [x] UI flow test: importing a bad file shows the message and progress is unchanged
- [ ] Manually verified export and import on iPhone (Safari and Home Screen app)

**Notes:** The backup format and import validation live in `src/backup/backup.ts` (pure, no DOM), not in the engine, so the engine and its progress shape are unchanged. A backup holds progress, the app name and theme, and Mijn woorden. Save and Load are in Settings. Loading asks before it replaces anything. Saving uses the share sheet when the browser can share files, and a download otherwise.
