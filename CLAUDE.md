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
  behavioural reference for the differential test. Never edit it.

## Commands

```
npm run serve        # http://localhost:4173/ear-trainer/ (served under a subpath, like Pages)
npm run lint         # eslint + prettier --check
npm test             # unit (vitest) then browser (playwright)
npx vitest run test/unit/theory.test.js          # one unit file
npx vitest run -t "labels the minor third"       # one unit test by name
npx playwright test smoke                        # one browser spec
DIFF_TARGET=<path> npx playwright test diff      # diff the seed against another page
```

`test/serve.mjs` 404s everything outside `/ear-trainer/`, so an absolute path fails in
tests the same way it would in production. Playwright starts it automatically.

## Tests that guard behaviour

- `test/e2e/smoke.spec.js` runs against both the seed and the app: every tab, one answer
  in each answer widget (keyboard, grid, sequence), no console errors, no request
  leaving the local origin.
- `test/e2e/diff.spec.js` runs one scripted session on the seed and on the app with
  `Math.random` seeded (reseeded per step) and `page.clock` paused, and requires identical
  DOM, form values, `localStorage`, downloaded files and full-page screenshots (dark and
  light) at every step. The seed is the reference, so this test pins seed behaviour: a
  deliberate behaviour change (bug fix, new feature) makes it fail by design, and the
  scenario or reference has to be updated in the same change, with the reason stated.
  It does not control `AudioContext.currentTime`, so jam is only snapshotted after stop.

## Architecture

Browser-native ES modules, loaded from `index.html` via `js/main.js`. Imports are
cyclic in places (`drills/trial.js` <-> `ui/stages.js` <-> `main.js`); that is only safe
because no module uses an import at load time. Keep top-level code free of calls into
other app modules.

- `js/state/store.js` - settings `S` and progress `P` (`localStorage` keys `pe.set`,
  `pe.prog`). `P` is replaced on reset; importers see it through the live binding, so
  never cache `P` in a local.
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
- `es` uses fixed-do (Do = C always). `en` uses letter names. Both overridable.
- Check Spanish music terminology against a real source before inventing it.

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
