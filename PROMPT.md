# Build brief — functional ear trainer (offline PWA on GitHub Pages)

Paste this as the first message in Claude Code, with `seed.html` in the repo root.

---

## What this is

A free, open-source ear-training web app. Offline-first, no accounts, no backend, no
subscription, no telemetry. Deployed as a static site on GitHub Pages, MIT licensed.

`seed.html` is a working single-file prototype: FM/Karplus-Strong synthesis, a 43-stage
ladder across pitch, intervals, chords, functional degrees, melodic dictation, progressions
and modes, plus a jam engine with a scheduled backing loop, chord-tone highlighting and
MIDI export. It works. It is not structured for maintenance and it fails in three specific
ways described in Phase 1.

Your job is to turn it into a maintainable repo and close those gaps. Do not rewrite the
music or audio logic from scratch; it is correct and tested by ear.

## Positioning (this drives feature priority)

The ear-training market is saturated in English. Two positions are open, and every
priority call should be resolved in their favour:

1. **Spanish-first, fixed-do by default.** Most competitors are English-first and
   movable-do or interval-name oriented. Fixed-do (Do = C, always) is the standard across
   Latin America and Spain. Spanish is not a translation layer bolted on at the end; it is
   the default when `navigator.language` starts with `es`.
2. **The drill-to-jam loop.** Every competitor either drills you or plays a backing track.
   None closes the loop: per-item error rates should decide what the jam engine throws at
   you, and the jam should be able to interrupt itself and ask what the last chord was.

## Hard constraints

- **No runtime network requests.** No CDN, no Google Fonts, no analytics, no remote
  images. Everything ships in the repo. A failed DNS lookup must be invisible to the user.
- **No build step required to deploy.** Ship plain ES modules that the browser loads
  directly. A bundler may exist for tests only, never as a deploy dependency.
- **No third-party runtime dependencies.** Dev dependencies (test runner, linter) are fine.
- **No audio sample files.** Everything is synthesised. This keeps the repo small and the
  MIT license clean.
- **Browsers:** iOS Safari 16+, Android Chrome, desktop Chrome/Firefox/Safari. iOS Safari
  is the primary target and the one that breaks.
- **All state in `localStorage`**, wrapped in try/catch, with the app rendering correctly
  when storage is empty or throws (private mode).
- **Every path relative.** GitHub Pages serves this from a subpath like
  `/ear-trainer/`. Absolute paths starting with `/` will 404 in production and work in
  local dev, which is the worst failure mode. Service worker scope, manifest `start_url`
  and every asset reference must be relative.

## Phase 0 — restructure, behaviour frozen

Split `seed.html` into modules with **no behavioural change**. Before you start, write down
how you will verify that: at minimum, a Playwright smoke test that loads the page, starts
each of the four tabs, answers one trial in three different drill kinds, and asserts no
console errors.

Target layout:

```
index.html
manifest.webmanifest
sw.js
css/app.css
js/
  main.js              boot, routing between views
  state/store.js       settings + progress, localStorage adapter, schema version
  theory/
    pitch.js           pitch class arithmetic, naming systems, MIDI <-> freq
    chords.js          chord tables, voicing, inversions
    scales.js          scale/mode tables, chord-scale mapping
    harmony.js         roman numerals, progressions, cadences, key context
  audio/
    context.js         AudioContext lifecycle, unlock, bus, reverb IR, limiter
    instruments.js     rhodes/pluck/marimba/organ/sine/bass, drums
    scheduler.js       lookahead scheduler, transport clock
  drills/
    registry.js        drill kind -> {make, play, render, grade, label}
    note.js interval.js chord.js inversion.js degree.js melody.js
    progression.js cadence.js scale.js
  jam/
    engine.js          bar scheduling, chord voicing
    midi-export.js     type-0 MIDI writer
  ui/
    keyboard.js grid.js sequence.js hud.js stages.js
  i18n/
    index.js es.json en.json
test/
docs/
.claude/skills/
```

Two known defects to fix while you are in there, both already patched once in the seed and
both easy to reintroduce:

- Degree index (0–6, position in scale) and semitone (0–11, distance from tonic) are
  different types. `DEGN`/`DEGS` are indexed by **semitone**. Anything indexing them by
  degree index prints `♭2` where `2` belongs. Encode this in the type/naming, e.g.
  `degreeToSemitone(d, scale)` and never pass a raw index to a label function.
- The CSS custom property block is hand-edited and has been corrupted once. Move tokens
  into `css/tokens.css` and keep them alphabetised.

## Phase 1 — ship blockers

Nothing is published until all five are done.

1. **PWA installable and genuinely offline.** `manifest.webmanifest` with relative
   `start_url` and `scope`, maskable icons (generate them, do not fetch them), and a
   service worker using cache-first with a versioned cache name, precaching the full file
   list at install, deleting stale caches on activate, and a visible "new version
   available, reload" affordance. *Accept when:* install to iOS home screen, enable
   airplane mode, cold launch, and every tab works including jam.
2. **iOS silent switch.** Web Audio routes to the ringer channel in Safari, so the app is
   silent when the hardware mute switch is on and the user has no idea why. Implement the
   silent-`<audio>`-loop workaround to move output to the media channel, started on the
   same user gesture that unlocks the AudioContext. Provide a settings toggle to disable
   it. *Accept when:* mute switch on, headphones out, audio is audible.
3. **AudioContext lifecycle.** Unlock on first gesture; `resume()` on
   `visibilitychange`; handle the interrupted state after a phone call or Siri. Never
   create a second context. *Accept when:* backgrounding the app for two minutes and
   returning does not require a reload.
4. **Jam timing off the audio clock.** Bar highlighting currently runs on `setTimeout`,
   which drifts under Low Power Mode and when the tab is backgrounded. Drive the UI from
   `AudioContext.currentTime` inside a `requestAnimationFrame` loop that reads a scheduled
   event queue. Keep the 25 ms poll / 250 ms lookahead for note scheduling.
   *Accept when:* 8 minutes at 160 bpm in Low Power Mode with visible bar highlight still
   aligned to the audible downbeat.
5. **Spanish-first i18n.** All UI strings in `i18n/*.json`, no hardcoded text. Default
   language and note-naming from `navigator.language`: `es*` gives Spanish UI and fixed-do
   naming (Do Re Mi), anything else gives English and letter names. Both overridable in
   settings. Spanish music terminology must be correct: *intervalo de quinta justa*,
   *acorde de séptima disminuida*, *grado*, *tónica*, *dominante*, *cadencia rota*,
   *modo mixolidio*. *Accept when:* a fresh profile on an `es-MX` device sees a fully
   Spanish UI with Do-Re-Mi names and no English fallback strings.

## Phase 2 — the differentiators

In priority order. Each lands behind a feature flag in settings until it is solid.

6. **Sing-back input.** Microphone pitch detection so the user sings the answer instead of
   tapping it. Use YIN or MPM over a 2048-sample window at 44.1 kHz, median-filtered over
   ~150 ms, with a clear "listening / heard X / hold steady" state machine and a confidence
   threshold below which you ask again rather than marking wrong. Needs a visible mic
   permission rationale and a hard guarantee that no audio leaves the device (state it in
   the UI and in the README). *Accept when:* singing a degree in a quiet room is graded
   correctly 9 times in 10, and octave errors are treated as correct for degree drills.
7. **Closed drill-to-jam loop.** A jam session mode where every N bars the backing stops
   and asks one question drawn from the weakest items in `progress.stats` and from the
   chord that just played (what was that chord, what degree was that bass note, sing the
   third of the next chord). Answers feed back into the same stats the stage ladder uses.
8. **Web MIDI input.** Answer drills from a controller. Unsupported in Safari, so it is a
   progressive enhancement that must never appear as a broken control on iOS.
9. **Spaced repetition.** Replace the current error-rate weighting with an SM-2-style
   scheduler per item, with a review queue and a "due today" count on the stage map.
   Persist review history with a schema version so it can migrate.
10. **Rhythm module.** Clap/tap-back and rhythmic dictation. Both EarMaster and Complete
    Ear Trainer have one; this is the largest remaining content gap.
11. **Better melody generator.** The current generator is a random walk and produces
    unmusical dictations. Replace with a weighted phrase grammar: strong-beat chord tones,
    stepwise motion biased 70/30 over leaps, leaps resolved by step in the opposite
    direction, phrase ending on 1, 3 or 5. Also add minor-key and modal progressions;
    progressions are currently major-only.
12. **Progress import.** Export exists, import does not, so there is no device migration.

## Testing

- **Pure functions** (`theory/`, `jam/midi-export.js`, scheduler maths) under Vitest. These
  are the parts worth unit testing and they are all deterministic.
- **Synthesis** via `OfflineAudioContext` in a Playwright browser test: render 1 s of a
  known MIDI note, FFT the buffer, assert the dominant bin is within 3 cents of the
  expected frequency for every instrument, and assert peak amplitude never exceeds 0 dBFS
  for a 6-note stack at max volume.
- **MIDI export** by parsing the emitted bytes back with a tiny test-only parser and
  asserting note-on/off pairing, tick positions and the tempo meta event.
- **Smoke** with Playwright against the built site, including one run with the service
  worker registered and the network blocked.
- No test may require audio hardware or a network.

## Repo hygiene

- MIT `LICENSE`, `README.md` with a screenshot, a one-line "what it does not do"
  (no accounts, no tracking, no cloud sync), and install instructions for iOS and Android.
- `CONTRIBUTING.md` short: no runtime dependencies, no samples, no network calls.
- GitHub Actions workflow deploying to Pages from `main` with `actions/deploy-pages`, plus
  a CI job running lint and tests on PRs.
- Conventional commits. Tag `v1.0.0` when Phase 1 is complete; Phase 2 items ship as minors.

## Anti-goals

No user accounts. No cloud sync. No subscription or paywall. No App Store or Play Store
wrapper. No audio sample packs. No analytics of any kind, including self-hosted. No
framework. If a change requires a backend, the answer is no.

## Start here

1. Read `seed.html` end to end before touching anything.
2. Propose the Phase 0 module split as a file list with a one-line responsibility each, and
   the smoke test that proves behaviour is unchanged. Wait for approval.
3. Then execute Phase 0 in one PR-sized change, Phase 1 items as one change each.
