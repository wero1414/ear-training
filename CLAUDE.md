# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Offline-first ear-training PWA. Static site, GitHub Pages, MIT.

## Orientation

- `PROMPT.md` is the build brief and the spec: phased plan (Phase 0 restructure, Phase 1
  ship blockers, Phase 2 differentiators), acceptance criteria, testing plan, anti-goals.
  Consult it before starting any phase item.
- `.claude/skills/` has `music-theory`, `web-audio-engine`, `offline-pwa`. Load the
  matching one before touching `js/theory|drills`, `js/audio|jam`, or SW/manifest/deploy.
- `test/baseline/seed.html` is the original single-file prototype, kept unchanged as the
  original behavioural reference (smoke test, regression checks). Never edit it.

## Commands

```
npm run serve        # http://localhost:4173/ear-training/ (served under a subpath, like Pages)
npm run lint         # eslint + prettier --check + ASCII-only check
npm test             # unit (vitest) then browser (playwright)
npx vitest run test/unit/theory.test.js          # one unit file
npx vitest run -t "labels the minor third"       # one unit test by name
npx playwright test smoke                        # one browser spec
npx playwright test session -u                   # re-record session snapshots
REG_URL=test/baseline/seed.html npx playwright test regressions   # run bug tests on the seed
```

`test/serve.mjs` 404s everything outside `/ear-training/`, so an absolute path fails in
tests the same way it would in production. Playwright starts it automatically.

## Tests that guard behaviour

- `test/e2e/session.spec.js` drives one scripted session per locale with `Math.random`
  seeded (reseeded per step) and `page.clock` paused, and compares DOM, form values,
  `localStorage` and downloads at every step, plus strict full-page screenshots (dark
  and light), against `test/e2e/__golden__/`. The first recording came from a build
  proven identical to the seed prototype plus the documented bug fixes.
  - A deliberate behaviour change re-records with `-u` in the same commit; the snapshot
    diff is the review of what changed, so read it before committing. Any other snapshot
    failure is a regression.
  - Screenshots are per platform (`-darwin`, `-linux`); the JSON is shared.
  - It does not control `AudioContext.currentTime`, so jam is only snapshotted after stop.
- `test/e2e/smoke.spec.js` runs against both the seed and the app: every tab, one answer
  in each answer widget (keyboard, grid, sequence), no console errors, no request
  leaving the local origin.
- `test/e2e/regressions.spec.js` has one test per fixed bug. Confirm each new one fails
  on the seed with `REG_URL=test/baseline/seed.html` before trusting it.

## Architecture

Browser-native ES modules, loaded from `index.html` via `js/main.js`. Imports are
cyclic in places (`drills/trial.js` <-> `ui/stages.js` <-> `main.js`); that is only safe
because no module uses an import at load time. Keep top-level code free of calls into
other app modules.

- `js/state/store.js` - settings `S` and progress `P` (`localStorage` keys `pe.set`,
  `pe.prog`). `P` is replaced on reset; importers see it through the live binding, so
  never cache `P` in a local. Stored progress carries `schema`; a change to its shape or
  meaning bumps `PROGRESS_SCHEMA` and adds a step in `js/state/migrate.js`.
- Stats (`P.stats[kind][key]`) drive adaptive weighting and the accuracy table. The key
  comes from the kind's `statKey(trial)`; degree stats are keyed by semitone above the
  tonic, never by degree index.
- `js/theory/` - pure data and functions, no DOM, no settings. `js/labels.js` binds
  them to the current naming setting (`nn`, `fullName`, `degText`, ...).
- `js/audio/` - `context.js` owns the single `AudioContext` and the master graph;
  `instruments.js` has all synthesis; `scheduler.js` has the lookahead constants.
- `js/drills/` - `trial.js` is the engine (make, play, timer, judge, run scoring) and
  holds the live `session.trial` / `session.run`. Each drill kind is a module registered
  in `registry.js` with `make/play/render/truth` and optional
  `grade/statLabel/slotLabel`; the kind -> module table is there. `chapters.js` is the
  stage ladder. `adaptive.js` has error-rate weighting and the no-repeat guard.
- `js/jam/` - `engine.js` schedules the backing loop; `midi-export.js` is the pure SMF
  writer.
- `js/ui/` - one module per view plus the shared answer widgets (`keyboard`, `grid`,
  `sequence`). Views render with `innerHTML` into `#view`.
- `js/i18n/` - string tables and `t()`. `main.js` fetches them, applies static text,
  then boots; `html[data-ready]` hides the page until then (see `css/app.css`).
- `css/tokens.css` holds design tokens (alphabetised, enforced by a unit test);
  `css/app.css` everything else.

Randomness order is observable: the diff test compares seeded runs, so reordering
`Math.random` consumers (including the reverb IR and pluck buffers) is a behaviour change.

## Rules that are not negotiable

- **No runtime network requests.** No CDN, no webfonts, no analytics, no remote images.
  If a feature needs the network, it does not ship.
- **No third-party runtime dependencies.** Dev dependencies only.
- **No build step to deploy.** Browser-native ES modules. A bundler exists for tests only.
- **No audio samples.** Everything synthesised.
- **Relative paths everywhere.** The site is served from a repo subpath. An absolute path
  works in local dev and 404s in production. This includes SW scope and manifest
  `start_url`.
- **No backend, no accounts, no telemetry.** State lives in `localStorage` only, wrapped in
  try/catch; the app must render when storage is empty or throws (private mode).
- **Browsers:** iOS Safari 16+ is the primary target and the one that breaks; also Android
  Chrome and desktop Chrome/Firefox/Safari.

## Audio

- One `AudioContext` for the lifetime of the page, created in `audio/context.js`. Never
  construct another.
- `exponentialRampToValueAtTime` cannot target 0. Use `0.0001`.
- Every oscillator and buffer source gets an explicit `stop()`. Leaked nodes are the
  reason long jam sessions crawl.
- Note scheduling is lookahead-based: a 25 ms poll scheduling 250 ms ahead. UI animation
  reads `AudioContext.currentTime`, never `Date.now()` or `setTimeout` chains. (`jam/engine.js`
  still drives the bar highlight with `setTimeout`; fixing that is Phase 1 item 4.)
- iOS Safari routes Web Audio to the ringer channel. The silent-audio-element workaround
  (Phase 1 item 2, goes in `audio/context.js`) is load-bearing; do not remove it as dead code.

## Music theory

- **Degree index** (0-6, position in a scale) and **semitone** (0-11, distance from tonic)
  are different types and are easy to confuse. Label tables are indexed by semitone.
  Convert with `degreeToSemitone(degree, scale)`. Never index a label table with a raw
  degree index. The tables are `DEGREE_NUMERALS_BY_SEMITONE` / `DEGREE_SOLFEGE_BY_SEMITONE`
  in `js/theory/scales.js`; `drillScale(sp, minor)` gives the scale a drill indexes into.
- Pitch class arithmetic is always `((x % 12) + 12) % 12`. JavaScript `%` keeps the sign.
- MIDI 60 is C4. `midi = (octave + 1) * 12 + pitchClass`.
- A4 is user-configurable, so never hardcode 440 outside the default settings object.

## i18n

- Spanish is the default for `es*` locales, not a fallback. No hardcoded UI strings.
- `es` uses fixed-do (Do = C always). `en` uses letter names. Both overridable. Defaults
  come from `localeDefaults()` in `js/state/migrate.js`.
- Check Spanish music terminology against a real source before inventing it. Chord
  symbols (maj7, m7, sus4) stay as-is: cifrado americano uses them in Spanish too.
- Strings live in `js/i18n/en.json` and `es.json` (same keys, same `{placeholders}`),
  read with `t('dotted.key', vars)`; static markup uses `data-i18n` / `data-i18n-html`.
  Theory tables hold data only; their display names are under `theory.*` in the tables.
  Never call `t()` at module load: strings arrive asynchronously at boot.
- A value identical in both languages must be listed in `js/i18n/same-in-all.json`;
  anything else equal to English fails `test/unit/i18n.test.js` as untranslated, and
  `test/e2e/i18n.spec.js` fails if English text shows up in the es-MX UI.
- Note naming (`S.naming`) and degree labels (`S.degNaming`: numbers or movable-do) are
  separate settings. A fixed-do user still sees degrees as numbers by default.

## Testing

- Pure theory functions and the MIDI writer are unit tested. Synthesis is tested by
  rendering through `OfflineAudioContext` and asserting frequency and peak level.
- No test may require audio hardware or a network.

## Style

- Plain modules, named exports, no classes unless there is state with a lifecycle.
- No comments restating the code. Comment the non-obvious: psychoacoustic choices,
  browser workarounds, why a magic constant is that value.
- CSS design tokens live in `css/tokens.css`, alphabetised (the hand-edited token block
  in the seed was corrupted once).
- Conventional commits.
