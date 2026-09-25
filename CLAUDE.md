# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Offline-first ear-training PWA. Static site, GitHub Pages, MIT.

## Current state (read first)

The repo is pre-Phase-0. It contains only:

- `seed.html` - the working single-file prototype (inline CSS + JS, ~1370 lines). It is
  the behavioural reference; do not rewrite its music or audio logic from scratch.
- `PROMPT.md` - the build brief: target module layout, phased plan (Phase 0 restructure,
  Phase 1 ship blockers, Phase 2 differentiators), acceptance criteria, testing plan and
  anti-goals. It is the spec; consult it before starting any phase item.
- `.claude/skills/` - `music-theory`, `web-audio-engine`, `offline-pwa`. Load the
  matching one before touching `js/theory|drills`, `js/audio|jam`, or SW/manifest/deploy.

There is no `package.json`, no test suite, no git history and no lint config yet, so
there are no build/test commands to run. Paths below such as `audio/context.js` refer to
the target layout in `PROMPT.md`, not files that exist. When tooling lands (planned:
Vitest for pure functions, Playwright for smoke and `OfflineAudioContext` synthesis
tests), record the run-all and run-single-test commands here.

Per `PROMPT.md`, Phase 0 starts by proposing the module split and the smoke test that
proves behaviour is unchanged, then waiting for approval before splitting.

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
  reads `AudioContext.currentTime`, never `Date.now()` or `setTimeout` chains. (The seed
  still drives jam bar highlighting with `setTimeout`; fixing that is Phase 1 item 4.)
- iOS Safari routes Web Audio to the ringer channel. The silent-audio-element workaround
  in `audio/context.js` is load-bearing; do not remove it as dead code.

## Music theory

- **Degree index** (0-6, position in a scale) and **semitone** (0-11, distance from tonic)
  are different types and are easy to confuse. Label tables are indexed by semitone.
  Convert with `degreeToSemitone(degree, scale)`. Never index a label table with a raw
  degree index. In `seed.html` the label tables are `DEGN`/`DEGS`, `degLabel` takes a
  semitone, and `degSemi` is the conversion (`degText` composes them).
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
