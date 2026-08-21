# Cascade

A living waterfall you compose in the browser.

Tune flow, width, drop, wind, mist, season, weather, and hour of day. The gorge answers with water, light, and sound — all on a canvas, no accounts required.

**Live:** open the in-chat preview. Source: this repository.

## In the scene

- Parametric waterfall (sheet, spray, foam, mist, rainbow)
- Day cycle from starlight through golden hour
- Seasons: spring blossom, summer green, autumn veil, winter ice
- Weather from clear to storm
- Optional living sky and wildlife
- Procedural waterfall audio (tap to start)

Presets: Yosemite, Golden Hour, Iceland, Hidden Shrine, Autumn Veil, Moonwell, Monsoon, Frozen.

## Try

- Drag **Flow**, **Width**, and **Drop** until the fall feels right
- Sweep **Time** from dawn to night
- Hit **Iceland** or **Moonwell**, then **Random**
- **Snapshot** opens the studio: keep the still, or paint it as Van Gogh or Klimt

## Keys

| Key | Action |
| --- | --- |
| `M` | Mute |
| `R` | Randomize climate |
| `G` | New gorge (new seed, same climate) |
| `S` | Snapshot / studio |
| `[` / `]` | Nudge the hour |

## Run locally

```bash
npm install
npm run dev
```

## Stack

React, TanStack Start, Tailwind, Canvas 2D, Web Audio. Snapshot painting uses xAI Imagine.
