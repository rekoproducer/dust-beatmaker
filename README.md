# BeatMaker

A minimalist, Instagram-worthy beat machine inspired by the Roland TR-707, TR-808, and TR-909.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Audio Engine | Tone.js |
| Export | Web Audio API + lamejs (MP3) |
| Testing | Vitest + Testing Library |

## Features

- **16-Step Sequencer** — Per-track step toggle with velocity control
- **3 Machine Modes** — 707, 808, 909 sound palettes
- **8 Tracks** — Kick, Snare, Hi-Hats, Clap, Toms, Rim, Cowbell
- **BPM Control** — 20–300 BPM range
- **Mute / Volume** — Per-track controls
- **Export** — WAV and MP3 via Web Audio API
- **Dark Mode UI** — Neon accents, minimalist design

## Getting Started

```bash
npm install
npm run dev
```

## Testing (TDD)

```bash
npm test            # single run
npm run test:watch  # watch mode
npm run test:ui     # browser UI
```

## Project Structure

```
src/
├── sequencer/      # Pure state engine (TDD-first)
│   ├── types.ts
│   └── sequencer.ts
├── engine/         # Tone.js audio playback
├── export/         # WAV / MP3 export
├── ui/
│   ├── components/ # React components
│   ├── hooks/      # useSequencer, useAudio
│   └── styles/     # Global CSS, tokens
├── sounds/         # Sample buffers per machine
└── tests/
    ├── unit/       # Sequencer logic tests
    └── integration/
```

## Roadmap

- [x] Phase 1 — Architecture & Project Setup
- [x] Phase 1 — Sequencer Logic (TDD: 27 tests passing)
- [ ] Phase 2 — Audio Engine (Tone.js + machine samples)
- [ ] Phase 3 — UI Build (Dark mode, neon grid)
- [ ] Phase 4 — Export (WAV / MP3)
- [ ] Phase 5 — Integration & Polish
