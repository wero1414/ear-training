---
name: music-theory
description: Use when writing or changing anything in js/theory/ or js/drills/ — pitch arithmetic, scales, chords, roman numerals, degree labelling, drill generation, or note naming in any language. Encodes the type distinctions that have already caused bugs.
---

# Music theory data model

## Types that look alike and are not

| Concept | Range | Example | Indexed by |
| --- | --- | --- | --- |
| pitch class | 0–11 | `7` = G | absolute |
| semitone from tonic | 0–11 | `7` = fifth above tonic | absolute |
| degree index | 0–6 | `4` = fifth degree of a 7-note scale | position |
| MIDI note | 0–127 | `60` = C4 | absolute |
| interval size | 0–12 | `7` = perfect fifth | distance |

Label tables (`DEGREE_NUMERALS`, `DEGREE_SOLFEGE`) are indexed by **semitone**. Passing a
degree index prints `♭2` where `2` belongs. This bug has shipped once. Always go through
`degreeToSemitone(degreeIndex, scaleIntervals)`.

## Arithmetic

- Pitch class: `((x % 12) + 12) % 12`. JavaScript `%` preserves sign and will hand you `-3`.
- MIDI from octave and pitch class: `(octave + 1) * 12 + pitchClass`. MIDI 60 is C4.
- Frequency: `a4 * 2 ** ((midi - 69) / 12)`. A4 is user-configurable; never hardcode 440
  outside the defaults object.
- Cents between two frequencies: `1200 * Math.log2(f1 / f2)`.

## Naming systems

Three, and they are not interchangeable:

- **Letter names with sharps or flats** — English default.
- **Fixed-do solfège** — Do is always C. Spanish and Italian default. `Do Do# Re Re# Mi
  Fa Fa# Sol Sol# La La# Si`. Note `Si`, not `Ti`.
- **Movable-do / degree function** — Do is the tonic whatever the key. Used only for
  degree and melody drills. Chromatic inflections: `Do Ra Re Me Mi Fa Fi Sol Le La Te Ti`.

A fixed-do user sees `Sol` as a pitch name and also needs degree labels. Do not collapse
the two: in C major the fifth degree is `Sol` in both systems, in E♭ major it is `Si♭` as
a pitch and `Sol` as a degree. Keep pitch naming and degree naming in separate functions.

## Chords

Interval sets from the root, in semitones. Inversion rotates: move the lowest interval up
an octave, `n` times. An inversion index must be less than the chord's cardinality, so a
triad has 3 positions and a seventh chord has 4.

Voicing for drills stays inside one octave span above the root where possible; wide
voicings change what the chord sounds like and make inversion drills unfair.

## Harmony

Roman numerals carry both a semitone offset from tonic and a quality:
`I 0 maj, ii 2 min, iii 4 min, IV 5 maj, V 7 maj, vi 9 min, vii° 11 dim`, plus borrowed
`♭VII 10 maj, iv 5 min, ♭VI 8 maj, ♭III 3 maj`.

Key context before any functional drill is a I–IV–V–I cadence at ~480 ms per chord. This is
not decoration: without it a degree question has no answer, because a note has no function
outside a key. Minor-key context uses i–iv–V–i, with a major dominant.

Chord-scale mapping for the jam display: maj/maj7/maj9/6 → ionian, min/m7/m9/m6 → dorian,
dom7/9 → mixolydian, 7♭9 → half-whole diminished, m7♭5 → locrian, dim/dim7 → half-whole,
aug → whole tone, mMaj7 → melodic minor, sus4 → mixolydian.

## Drill generation

- Never repeat the previous answer twice in a row. Retry with a guard counter, do not loop
  forever when the answer set has one member.
- Adaptive weighting: `w = 1 + 3.2 * (1 - correct / attempts)` once there are at least 3
  attempts, otherwise `2` so untested items surface early.
- Melodies must be musical or the dictation trains nothing. Strong beats take chord tones,
  motion is roughly 70% stepwise, leaps resolve by step in the opposite direction, phrases
  end on 1, 3 or 5. A random walk between scale degrees is not acceptable.
- For degree drills, octave displacement is intentional: the same degree in different
  octaves must be graded identically, because the skill is function, not register.
