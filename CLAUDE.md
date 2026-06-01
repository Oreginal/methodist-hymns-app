# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Progressive Web App for Methodist Church members to read hymn books and prayers, with offline caching and a projection (presentation) mode for sanctuary use. It ships with a separate offline pipeline that parses Methodist hymns out of PowerPoint slides into structured JSON.

The project has two largely independent halves:
1. **The React PWA** (`src/`) — the user-facing app, built with Vite.
2. **The PowerPoint import pipeline** (`scripts/import_hymns.ts`) — a standalone Node/tsx script that converts `.ppt`/`.pptx` slides into hymn JSON.

## Commands

```bash
npm run dev          # Vite dev server on port 3000, host 0.0.0.0
npm run build        # Production build to dist/
npm run preview      # Preview the production build
npm run lint         # Type-check only (tsc --noEmit) — there is no ESLint
npm run import:hymns # Run the PowerPoint -> JSON pipeline (alias for: npx tsx scripts/import_hymns.ts)
```

There is **no test runner** configured. `npm run lint` (a `tsc --noEmit` type-check) is the only automated verification gate.

The `@/*` path alias resolves to the repo root (see `vite.config.ts` and `tsconfig.json`). Setting `DISABLE_HMR=true` disables HMR and file watching — this is used in the AI Studio hosting environment; do not change that behavior.

## React app architecture

- **State is fully centralized in one React Context**: `src/context/AppContext.tsx`. There is no router and no external state library. Navigation, the active hymn/prayer, search, favourites, settings, downloads, and auth all live here and are consumed via the `useApp()` hook. Adding a feature almost always means extending `AppContextType` and the provider, not adding new infrastructure.
- **"Routing" is a tab switch.** `src/App.tsx` renders one of the screen components based on `activeTab` (`home | hymns | prayers | saved | settings`). The active hymn renders as an overlay (`HymnDetailScreen`) on top of whatever tab is active. `BottomNavigation` sets `activeTab`.
- **Auth gate**: if `currentUser` is null, `App.tsx` short-circuits to `SaaSGatewayScreen` before any tab renders. "Auth" is entirely client-side and simulated — users and the current session are stored in `localStorage` (`mhb_registered_users`, `mhb_current_user`); there is no backend, no password, and login only checks that an email was previously registered. Tiers (`free | individual-pro | parish-license`) are cosmetic.
- **Persistence is localStorage**, keyed with the `mhb_` prefix (recents, continue-reading, favourites, downloaded books, users, session). Each piece of state has its own `useEffect` sync. Book "downloads" are a simulated progress timer, not real caching.
- **Display modes are driven by classes on `document.documentElement`**: `setDarkMode` toggles `.dark` (Tailwind dark variant) and `setProjectionMode` toggles `.projection`. Font size is clamped to 14–36.
- **Styling** is Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no `tailwind.config.js`; configured in `src/index.css`). Components use inline utility classes with hard-coded brand colors (e.g. `#E53935` red, `#FAFAFA`/`#111111` backgrounds).

## Data layer — important

The app's hymns and prayers come from **hard-coded TypeScript arrays**, not from JSON files or any API:
- `src/data/hymnsData.ts` — `hymnsDatabase: Hymn[]` and the `hymnBooks` list (xhosa / setswana / sesotho / english).
- `src/data/prayersData.ts` — `prayersDatabase: Prayer[]`.

The shared shapes (`Hymn`, `Prayer`, `Book`, `User`, `Favourites`, etc.) live in `src/types.ts`. A hymn is identified by the `(bookId, hymnNumber)` pair; `lyrics` is a single string with verses separated by blank lines (`\n\n`) and a trailing `AMEN`.

**The import pipeline is NOT wired into the app.** `npm run import:hymns` writes `public/data/xhosa.json`, but nothing in `src/` reads that file — the running app only reads `src/data/hymnsData.ts`. To get pipeline output into the app you must currently move/transcribe it into `hymnsData.ts` by hand. Keep this disconnect in mind before assuming generated data appears in the UI.

## PowerPoint import pipeline (`scripts/import_hymns.ts`)

A single-file script that turns hymn slides into the `Hymn` schema. Flow:
1. Reads raw slides from `import-source/` (`.ppt` legacy binary and/or `.pptx`).
2. Converts `.ppt` -> `.pptx` via headless **LibreOffice** (`soffice`), auto-detected at standard install paths per OS; output goes to `import-source-converted/`. If LibreOffice is absent it logs manual instructions and flags those files for review instead of failing.
3. Parses each `.pptx` by unzipping it (`adm-zip`) and regex-scraping `<a:t>` text runs out of `ppt/slides/slideN.xml` — there is no Office XML library; parsing is regex-based.
4. Heuristics infer structure: the filename pattern `^([A-Za-z]+)(\d+)\s*(.*)$` gives book code + hymn number + title (e.g. `X011 Bulelani kuYehova`); slide 1 is treated as metadata if it matches title/scripture/author signifiers; English translation lines are detected against a hard-coded `ENGLISH_WORD_SET`; scripture is matched against `SCRIPTURE_BOOKS_REGEX`; standalone verse numbers and `AMEN` lines are stripped.
5. If `import-source/` and `import-source-converted/` are both empty, `generateMockPowerPoints()` writes sample `.pptx` files so the pipeline always has something to process.

Outputs (all at repo root / `public/data`):
- `public/data/xhosa.json` — only `bookId === 'xhosa'` hymns are exported, mapped to the app's `Hymn` schema.
- `import-report.json` — counts and per-file success/failure details.
- `manual-review.json` — quality flags (missing AMEN, short lyrics, no scripture match, unconverted legacy `.ppt`).

When changing pipeline output, keep it conformant to the `Hymn` interface in `src/types.ts` so the data can eventually feed the app.
