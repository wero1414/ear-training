# Contributing

Three rules that are not negotiable:

- **No runtime dependencies.** Development tools (test runner, linter) are fine.
- **No audio samples.** Every sound is synthesised in code.
- **No network calls.** No CDN, web fonts, analytics or remote images. The app must work
  with no network at all.

Also: every path is relative (the site lives under a subpath), all UI text goes through
`js/i18n/*.json` in both languages, and the source is ASCII (write symbols as `\u`
escapes).

Before sending a change, run `npm run lint` and `npm test`. If you change behaviour on
purpose, re-record the session snapshots (`npx playwright test session -u`, plus
`npm run snapshots:linux` with Docker running) and say why in the commit. Commits use
Conventional Commits (`feat:`, `fix:`, `test:`, ...).
