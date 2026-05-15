# GTA: Vice City — WASM Port

## Overview
A browser-based port of GTA: Vice City using WebAssembly. The game runs entirely in the browser using OPFS (Origin Private File System) for local storage and a Service Worker for serving game assets.

## Architecture

- **Frontend**: Vanilla JS + Vite
- **Game engine**: WASM (via js-dos / reVCDOS)
- **Game storage**: OPFS (browser local filesystem)
- **Asset serving**: Service Worker serves game files from OPFS
- **Auto-download**: Vite dev server proxies the 701MB `game.tar.gz` from archive.org to the browser without CORS issues

## Key Files

- `index.html` — main UI (setup screen + game canvas)
- `src/main.js` — setup flow: auto-downloads game, extracts to OPFS, launches game
- `src/style.css` — all custom styles
- `public/extract-worker.js` — Web Worker that decompresses and extracts `game.tar.gz` into OPFS
- `public/sw.js` — Service Worker that intercepts `/vcbr/` and `/vcsky/` requests and serves from OPFS
- `vite.config.js` — Vite config with a custom plugin that proxies the game download from archive.org (handling redirects and CORS)

## Auto-Download Flow

1. Page loads → registers Service Worker
2. Checks if game files already exist in OPFS
3. If not: fetches `/proxy-game-download/game.tar.gz` (handled by Vite plugin → proxies to archive.org CDN)
4. Progress bar shows 0–80% during download, 80–100% during extraction
5. Worker decompresses and writes files to OPFS
6. Status updates to "Ready to play" → user clicks Start

## Environment Variables

- `VITE_ASSET_URL` — URL to the `game.tar.gz` (default: `https://archive.org/download/gta-vicecity-wasm-assets/game.tar.gz`)

## Running Locally

```
pnpm install
pnpm run dev
```

## Notes

- The game requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for SharedArrayBuffer support
- The proxy plugin in `vite.config.js` handles the cross-origin download by proxying through the dev server
- First visit downloads ~701MB; subsequent visits load instantly from OPFS
