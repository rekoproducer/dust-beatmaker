# DUST Projekt-Status (Release: 26.05.2026)

**Projekt:** rekobeats DUST — Beatmaker Web App
**GitHub:** https://github.com/rekoproducer/dust-beatmaker
**Live:** https://rekoproducer.github.io/dust-beatmaker/
**Stack:** React 19 · TypeScript · Tone.js v15 · Vite 8 · Vitest
**Tests:** 68 / 68 ✓

---

## 1. System-Architektur

Der Beatmaker ist als **dreischichtiges Audio-First-System** aufgebaut:

```
React UI (State/Events)
    ↕
useSequencer Hook (Zustandsbrücke)
    ↕
AudioEngine (Tone.js, Audio-Thread)
    ↓
AtmosphericEngine (FX-Chain, Recorder-Tap)
    ↓
masterOut → Tone.Destination
         → MediaStreamDestination (Live Recording)
```

**Schlüsselprinzip:** Der `AudioEngine` besitzt `currentStep` und `isPlaying` im Audio-Thread. React darf diese Werte nur lesen, nie überschreiben — das verhindert Timing-Desynchronisation beim Step-Toggle.

**Sample-Discovery (Dev vs. Prod):**
- Dev: Vite-Middleware `GET /api/stems/:folder` liest Ordner live vom Filesystem
- Prod: Statische `manifest.json` pro Bank-Ordner (generiert via `npm run manifests`)

**Audio-Signal-Chain:**
```
Tone.Sampler (WAV) ─┐
                    ├→ masterVol → dustLPF → dustHPF → [opt: BitCrusher → fxHP] → masterOut
vinyl_crackle.wav ──┘                                                             ↓
                                                                    Tone.Destination + MediaStream
```

---

## 2. Modul-Übersicht

### Engine (`src/engine/`)

| Modul | Funktion |
|---|---|
| `audioEngine.ts` | Tone.Sequence-Takt, Sampler-Loader, Humanize-Jitter, Bank-Switch |
| `stemLoader.ts` | WAV-Discovery (API/Manifest), ein Tone.Sampler pro Datei, encodeURIComponent |
| `atmosphericEngine.ts` | LPF/HPF Filter, BitCrusher-FX, Vinyl-Textur-Loop, Stutter-Gate, Recording-Stream |
| `synths.ts` | Legacy-Synthese (707/808/909) — nur noch für Offline-Export-Fallback |
| `recorder.ts` | MediaRecorder-Wrapper, Blob-Erzeugung, automatischer Download |

### Sequencer (`src/sequencer/`)

| Modul | Funktion |
|---|---|
| `types.ts` | StemBank, Track, Step, SequencerState, STEM_BANKS-Config, RESOLUTION_STEP_COUNT |
| `sequencer.ts` | Pure Functions: toggleStep, setTracks (preserviert Steps), advanceStep, computeSwingOffset |

### Export (`src/export/`)

| Modul | Funktion |
|---|---|
| `offlineRenderer.ts` | Tone.Offline-Render mit Swing-Math, optionalem DUST FX und Vinyl-Textur |
| `wavEncoder.ts` | AudioBuffer → RIFF/WAV Blob (pure function, 16-bit PCM) |
| `mp3Encoder.ts` | AudioBuffer → MP3 Blob via lamejs (192 kbps) |

### UI Hooks (`src/ui/hooks/`)

| Hook | Funktion |
|---|---|
| `useSequencer.ts` | Zustandsbrücke React ↔ AudioEngine, alle Dispatch-Actions |
| `useKeyboardShortcuts.ts` | Space (Play/Stop), 1–4 (Banks), C (Clear), Shift (Stutter) |
| `usePaintMode.ts` | Drag-to-Paint: mousedown setzt Malmodus, mouseenter malt Steps |
| `useRecorder.ts` | MediaRecorder lifecycle, Timer-State, Toast-Feedback |

### UI Components (`src/ui/components/`)

| Komponente | Funktion |
|---|---|
| `Transport.tsx` | Play/Stop, BPM-Slider + Nudge, Clear-Button |
| `BankSelector.tsx` | 4 Album-Bänke (01–04) mit Bank-Farbe und Loading-Spinner |
| `StepGrid.tsx` | 16-Step-Grid, horizontaler Scroll bei 32/64 Steps, Beat-Ruler |
| `TrackRow.tsx` | Label (Preview-Klick), Mute, Volume, 16+ Step-Buttons |
| `StepButton.tsx` | Physischer Pad-Look, Velocity-Dot, Playhead-Highlight (amber) |
| `DustFxButton.tsx` | BitCrusher + HP-Filter Toggle, pulsierender Gold-Glow |
| `DustFilterPanel.tsx` | LPF + HPF Rotary-Knobs (SVG, vertikal ziehen) |
| `SwingControl.tsx` / `HumanizeControl.tsx` | Timing-Regler (gemeinsames SliderControl.module.css) |
| `RecordButton.tsx` | ◉ REC / ◼ STOP `00:12`, Toast: "✓ Session saved" |
| `InfoOverlay.tsx` | Modal mit allen Shortcuts, Escape/Klick-außen zum Schließen |
| `ExportPanel.tsx` | WAV/MP3 Offline-Export mit `+FX`-Tag wenn DUST FX aktiv |

### Scripts (`scripts/`)

| Script | Funktion |
|---|---|
| `generate-manifests.mjs` | Pre-Build: scannt `/public/audio/stems/`, erzeugt `manifest.json` pro Bank |
| `generate-placeholders.mjs` | Utility: erzeugt stille Placeholder-WAVs für alle Banks |
| `generate-vinyl-crackle.mjs` | Utility: synthetisiert `vinyl_crackle.wav` (seeded Noise + Crackle-Peaks) |

### Öffentliche Assets (`public/audio/`)

```
public/audio/
├── stems/
│   ├── 01-core-command/   → BD1.wav, BD2.wav, SD.wav, hat1.wav, hat2.wav + manifest.json
│   ├── 02-sinter/         → BD.wav, BD2.wav, SD.wav, hh.wav + manifest.json
│   ├── 03-dust/           → SD.wav, bd1.wav, bd2.wav, clap.wav, perc.wav, perc2.wav + manifest.json
│   └── 04-particles/      → SD.wav, bd1.wav, bd2.wav, hh1.wav, hh2.wav, perc1.wav + manifest.json
└── textures/
    └── vinyl_crackle.wav  → 4s seeded Noise-Loop (-30dB Ambience)
```

---

## 3. Technischer Fortschritt

### ✅ Implementiert

| Feature | Details |
|---|---|
| 16-Step-Sequencer | 4n / 16n / 32n / 64n Grid, horizontaler Scroll bei dichten Grids |
| Sample-Loading | Dynamische WAV-Discovery, ein Sampler pro Datei, Dateiname = Track-Label |
| Audio-Synchronisation | `updateState()` schützt `currentStep` — kein Timing-Bug mehr beim Step-Toggle |
| Drag-to-Paint | mousedown setzt Mal-Richtung (AN/AUS), mouseenter malt spur-intern durch |
| DUST FX | BitCrusher (8-bit) + High-Pass 300Hz, toggelbar, im Export repliziert |
| DUST FILTER | LPF (200Hz–20kHz) + HPF (20Hz–2kHz), rotary Knobs, logarithmisch |
| Swing + Humanize | Swing via Tone.Transport.swing, Humanize ±20ms Jitter im Audio-Thread |
| Vinyl Textur | vinyl_crackle.wav, -30dB Loop, startet mit erstem Play |
| Stutter FX | SHIFT-Taste gated masterOut.gain bei 1/32n (links) / 1/64n (rechts) |
| Live Recording | MediaRecorder vom masterOut-Tap, Timer, Toast, Auto-Download .webm |
| WAV/MP3 Export | Tone.Offline-Render, Swing-Math, DUST FX + Vinyl optional mitgerendert |
| Keyboard Shortcuts | Space, 1–4, C, Shift — mit blur-Event Cleanup |
| Info-Overlay | Alle Shortcuts, Release-Datum, "Made by rekobeats" |
| GitHub Pages Deploy | Actions Workflow, BASE_URL-korrigierte Asset-Pfade, Auto-Deploy bei Push |
| DUST-Theme | Dusty Gold #C5A059, Deep Amber #E8832A, physische Pad-3D-Effekte, CSS Grain |

### 🔲 Noch offen / Optionale Erweiterungen

| Feature | Aufwand |
|---|---|
| MIDI-Export via @tonejs/midi | Dependency bereits installiert, Logik fehlt |
| Supabase Storage für große WAV-Sets | Für Stems > 100 MB empfohlen |
| Pattern-Speicherung (localStorage) | Beat-Preset speichern und laden |
| Velocity-Editor (per Step) | Rechtsklick → Velocity-Popup |
| BPM Tap-Tempo | Button oder Taste zum Eintippen des BPM |
| Mobile Touch Support | Touch-Events für Drag-to-Paint |
| Weitere Step-Banks | z.B. 32 Steps über 2 Bars |

---

## 4. Obsidian-Kontext

**DUST Beatmaker** ist eine browser-basierte Drum-Machine-Web-App, die als kreatives Promotion-Tool für das Album *DUST* von rekobeats (Release: 26.05.2026) entwickelt wurde. Sie lädt automatisch die Album-Stems aus vier Track-Bänken (`01-core-command`, `02-sinter`, `03-dust`, `04-particles`), bietet einen 16-Step-Sequencer mit Swing, Humanize, Vinyl-Textur und DUST FX (BitCrusher + Filter), und ermöglicht Live-Recording sowie WAV/MP3-Export direkt im Browser ohne Backend. Das Projekt ist unter `https://rekoproducer.github.io/dust-beatmaker/` deployed und folgt einem TDD-First-Ansatz mit 68 Tests, sauber getrennten Audio-Engine- und UI-Schichten sowie automatischem GitHub-Actions-Deployment.
