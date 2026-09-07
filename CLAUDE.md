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
npm test             # Importer tests (tsx --test scripts/import_hymns.test.ts)
npm run import:hymns # Run the PowerPoint -> JSON pipeline (alias for: npx tsx scripts/import_hymns.ts)
```

`npm run lint` (a `tsc --noEmit` type-check) and `npm test` are the automated verification gates. The tests cover the import pipeline only (marker parsing, filename/number identity, end-to-end `parsePptx`); there are no tests for `src/`.

The importer takes two flags: `--merge` (upsert into the existing book JSON instead of overwriting) and `--book=<xhosa|sesotho|setswana|english>` (the book for a batch whose filenames carry no letter code). Import one book per batch, and clear `import-source-converted/` between batches — marked and unmarked decks share filenames, so a stale converted cache would be re-parsed.

The `@/*` path alias resolves to the repo root (see `vite.config.ts` and `tsconfig.json`). Setting `DISABLE_HMR=true` disables HMR and file watching — this is used in the AI Studio hosting environment; do not change that behavior.

## React app architecture

- **State is fully centralized in one React Context**: `src/context/AppContext.tsx`. There is no router and no external state library. Navigation, the active hymn/prayer, search, favourites, settings, downloads, and auth all live here and are consumed via the `useApp()` hook. Adding a feature almost always means extending `AppContextType` and the provider, not adding new infrastructure.
- **"Routing" is a tab switch.** `src/App.tsx` renders one of the screen components based on `activeTab` (`home | hymns | prayers | saved | settings`). The active hymn renders as an overlay (`HymnDetailScreen`) on top of whatever tab is active. `BottomNavigation` sets `activeTab`.
- **Auth gate**: if `currentUser` is null, `App.tsx` short-circuits to `SaaSGatewayScreen` before any tab renders. "Auth" is entirely client-side and simulated — users and the current session are stored in `localStorage` (`mhb_registered_users`, `mhb_current_user`); there is no backend, no password, and login only checks that an email was previously registered. Tiers (`free | individual-pro | parish-license`) are cosmetic.
- **Persistence is localStorage**, keyed with the `mhb_` prefix (recents, continue-reading, favourites, downloaded books, users, session). Each piece of state has its own `useEffect` sync. Book "downloads" are a simulated progress timer, not real caching.
- **Display modes are driven by classes on `document.documentElement`**: `setDarkMode` toggles `.dark` (Tailwind dark variant) and `setProjectionMode` toggles `.projection`. Font size is clamped to 14–36.
- **Styling** is Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no `tailwind.config.js`; configured in `src/index.css`). Components use inline utility classes with hard-coded brand colors (e.g. `#E53935` red, `#FAFAFA`/`#111111` backgrounds).

## Data layer — important

Prayers, and the seed/fallback hymns for every book, come from **hard-coded TypeScript arrays**; imported hymn books are then fetched over HTTP (see below):
- `src/data/hymnsData.ts` — `hymnsDatabase: Hymn[]` and the `hymnBooks` list (xhosa / setswana / sesotho / english).
- `src/data/prayersData.ts` — `prayersDatabase: Prayer[]`.

The shared shapes (`Hymn`, `Prayer`, `Book`, `User`, `Favourites`, etc.) live in `src/types.ts`. A hymn is identified by the `(bookId, hymnNumber)` pair; `lyrics` is a single string with verses separated by blank lines (`\n\n`) and a trailing `AMEN`.

**The pipeline output IS wired into the app.** `npm run import:hymns` writes `public/data/<bookId>.json`; `AppContext.loadBook(bookId)` fetches `/data/<bookId>.json` when the user opens that book, validates it, caches it in `localStorage` under `mhb_book_cache_<bookId>`, and swaps only that book's slice into state. The hard-coded arrays remain the offline fallback for any book with no imported JSON (currently `english`).

## PowerPoint import pipeline (`scripts/import_hymns.ts`)

A single-file script that turns hymn slides into the `Hymn` schema. Flow:
1. Reads raw slides from `import-source/` (`.ppt` legacy binary and/or `.pptx`).
2. Converts `.ppt` -> `.pptx` via headless **LibreOffice** (`soffice`), auto-detected at standard install paths per OS; output goes to `import-source-converted/`. If LibreOffice is absent it logs manual instructions and flags those files for review instead of failing.
3. Parses each `.pptx` by unzipping it (`adm-zip`) and regex-scraping `<a:t>` text runs out of `ppt/slides/slideN.xml` — there is no Office XML library; parsing is regex-based.
4. **English detection is marker-driven, with a heuristic fallback.** A pre-processing pass (`hymn books/process_hymns.ps1`) analysed run colours and wrapped red English runs in `[ENG]` … `[/ENG]`. `splitEnglishMarkers()` resolves those markers over each slide's whole character stream — NOT line by line, because the markers were inserted per PowerPoint *formatting run* and a closing `[/ENG]` routinely lands at the start of the next paragraph, fused to a native line. A deck with real markers is parsed in **marker mode** (`englishSource: 'markers'`), where `isEnglishLine()` is never consulted. A deck with none falls back to the original `ENGLISH_WORD_SET` heuristic unchanged. A marked region containing no 2+ letter word (a red drop-cap letter, or a Sesotho chant-pointing `|`) is not a translation and is spliced back inline as native text.
5. Identity comes from the filename in three forms, in order: `X011 Bulelani kuYehova` (letter code + number), `1 Mphe maleme a sekete` (bare number, book from `--book`), or no number at all — in which case the hymn number is harvested from a slide header such as `TSWANA 397`. A deck with no resolvable number is **skipped and flagged**, never given an invented number.
6. Other heuristics infer structure: slide 1 metadata lines are stripped in place; scripture is matched against `SCRIPTURE_REFERENCE_REGEX`; standalone verse numbers and `AMEN` lines are stripped.
7. If `import-source/` and `import-source-converted/` are both empty, `generateMockPowerPoints()` writes sample `.pptx` files so the pipeline always has something to process.

Outputs (all at repo root / `public/data`):
- `public/data/<bookId>.json` — one file per book that produced records, mapped to the app's `Hymn` schema. A run only writes the books it actually parsed, so a Sesotho batch cannot truncate `xhosa.json`.
- `import-report.json` — counts and per-file success/failure details.
- `manual-review.json` — quality flags (missing AMEN, short lyrics, no scripture match, unconverted legacy `.ppt`).

When changing pipeline output, keep it conformant to the `Hymn` interface in `src/types.ts` so the data can eventually feed the app.
