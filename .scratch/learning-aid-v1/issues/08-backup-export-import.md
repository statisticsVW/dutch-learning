# 08: Backup: export and import progress

Spec: `.scratch/learning-aid-v1/spec.md`. ADR: 0001.

**What to build:** The saved progress format carries a version number. The Learner can export his progress as a backup file (via the share sheet / Files on iOS) and import one to restore it, e.g. on a new phone. Importing a damaged, wrong or unknown-version file shows a clear message and leaves current progress untouched. The app name and theme are included in the backup.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Engine tests: export → import round-trip restores identical progress
- [ ] Engine tests: malformed, wrong-shape and unknown-version imports are rejected without changing state
- [ ] UI flow test: importing a bad file shows the message and progress is unchanged
- [ ] Manually verified export and import on iPhone (Safari and Home Screen app)
