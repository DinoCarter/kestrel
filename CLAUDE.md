# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Kestrel ("Know before you go") — formerly WDST — is a browser-based risk scoring tool for standardizing weather-related operational decisions on university campuses in Oklahoma. It is a **decision aid, not a decision authority**: it converts structured weather inputs into 0–100 risk scores across three categories (Facility Operations, Outdoor Activities, Roads & Travel) for three hazard modes (Severe Weather, Heat, Winter Weather). See README.md for the full scoring formula, weight tables, and stoplight bands — that documentation is the source of truth for scoring behavior and should stay in sync with `WEIGHTS` in script.js if either changes.

## Tech stack & running locally

No build system, no package manager, no dependencies — plain HTML/CSS/JS (`index.html`, `script.js`, `styles.css`) served as static files. There is no test suite or linter configured.

To run locally, serve the directory with any static file server, e.g.:
```
ruby -run -e httpd . -p 7842
```
(`.claude/launch.json` defines this exact launch config.) Then open `http://localhost:7842`.

## Architecture

Everything client-side lives in **script.js**, organized into numbered sections (search for `N. SECTION NAME` headers):

1. **Locations** — hardcoded lat/lon for the five supported Oklahoma campuses (`LOCATIONS`).
2. **Scoring engine** — `WEIGHTS` (per-mode, per-input, per-category weight table) and `calcScoreByType`/`calcScoresFromInputs`, which implement the `Σ(raw × weight) / 100` formula from README.md. This is the one source of truth for scoring math — manual and NWS-derived inputs both funnel through it.
3. **Manual input readers** — `calcManualSevere`/`calcManualHeat`/`calcManualWinter` read form select/radio values into the raw-input shape the scoring engine expects.
4. **NWS API layer** — `fetchNWSData` hits `api.weather.gov` (points → hourly forecast + grid data + active alerts, fetched in parallel) for a given location and forecast window.
5. **Unit helpers** — converters (`toInches`, `toMph`, `toDegF`, grid-window aggregation) for normalizing NWS's mixed unit codes.
6. **NWS → score inputs mapper** — `mapNWSToSevere`/`mapNWSToHeat`/`mapNWSToWinter` translate raw NWS API data into the same raw-input shape the manual readers produce, so both paths converge on the same scoring engine.
7. **Condition summary engine** — `buildConditionSummary` generates the plain-English, threshold-referencing explanations shown per active input.
8. **NWS data display** — renders the fetched forecast/alerts data block in the results panel.
9. **Results renderer** — `renderResults`/`renderScoreCard` build the score cards and condition summary DOM.
10. **UI behavior** — hazard mode toggles, input-mode (API vs. manual) switching, validation, loading states.
11. **PDF export** — `handleExport` drives the browser print dialog with print-optimized CSS (see `styles.css` print rules) to produce the assessment record.
12. **Misc helpers** — date/time formatting.
13. **Init** — `DOMContentLoaded` wiring for all event listeners.

Key invariant: manual entry and API-driven entry are two parallel paths into the **same** `calcScoresFromInputs` engine — when changing scoring logic, check both `calcManual*` and `mapNWSTo*` functions for the affected mode, not just one.

Multi-mode assessments (e.g., Severe + Winter active at once) produce fully independent score sets per mode; modes are never combined or averaged.
