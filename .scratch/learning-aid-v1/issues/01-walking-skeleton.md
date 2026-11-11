# 01: Walking skeleton: a live link showing the Packs

Spec: `.scratch/learning-aid-v1/spec.md`. Glossary: `CONTEXT.md`. ADR: 0001.

**What to build:** The Curator has a public link that opens a (very plain) app listing the Packs. Behind it: the folder becomes a git repository with a public GitHub repository, a Vite + TypeScript + Preact app with Vitest, and a GitHub Action that runs the tests and the content check, then deploys to GitHub Pages. One small sample Pack file (a few Cards, YAML) flows through a basic content check (valid structure, unique Card ids) into the app, which shows it in a Pack list. Follow the privacy rule in CLAUDE.md: nothing personal in the repository, neutral repository name.

**Blocked by:** None (can start immediately). Creating the GitHub repository needs the Curator signed in to `gh`; if not, stop and ask.

**Status:** ready-for-agent

- [ ] Git repository initialised; public GitHub repository created and pushed
- [ ] App builds and runs locally; Vitest runs with at least one passing test
- [ ] Content check rejects a Pack file with invalid structure or duplicate Card ids, with a plain-language message (tested)
- [ ] Sample Pack is read from its YAML file and listed in the app
- [ ] GitHub Action runs tests + content check and deploys to GitHub Pages; a failure blocks deploy
- [ ] The live URL shows the Pack list
