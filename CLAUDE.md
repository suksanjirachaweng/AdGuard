# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AdGuard** — ระบบตรวจจับโฆษณาเกินจริงด้วย AI (False Advertising Detection System). A Thai government-style web prototype for detecting false/misleading advertising, built for users at อย. (FDA), สคบ. (OCPB), กสทช., and DSI.

Cases and AI-context are **persisted in Postgres (Supabase)**, and the **"ตรวจสอบใหม่" (New Check) flow calls the real Claude API** via a small Node backend. (Dashboard headline stat cards are still illustrative constants.)

## Two front-ends, one backend

There are **two interchangeable front-ends** that both talk to the same Express API in `server.js`:

1. **`client/`** — the current React (Vite) app. This is the primary front-end. `vite build` emits to `./public`, which `server.js` serves.
2. **Root `index.html` / `app.js` / `styles.css`** — the original vanilla single-file port. Still works (served as a fallback when `public/` is absent), kept as a reference.

### Running (React, primary)

```bash
npm install                 # backend deps
npm run client:install      # client deps (first time)
cp .env.example .env        # add ANTHROPIC_API_KEY + DATABASE_URL (Supabase)

# Dev (two terminals): Vite on :5173 proxies /api → Express on :3000
npm run client:dev
npm start

# Production: build the client, then serve everything from Express
npm run build               # client → ./public
npm start                   # http://localhost:3000
```

Without an API key the server still boots and serves the UI; only the analyze flow fails (surfaced as a browser alert).

The original Claude Design exports under `false-advertising-detection-system/project/` remain the source-of-truth design reference.

## Testing

Both suites use **Vitest**. Run them from the repo root:

```bash
npm test          # backend only (test/*.test.js — Node env)
npm run test:all  # backend + frontend (client/src/**/*.test.{js,jsx})
```

- **Backend** (`test/`, `vitest.config.js`, Node env) — `db.test.js` covers seeding, counts, `insertCaseFromAnalysis`, `referCase`, context insert/toggle; `api.test.js` drives the Express routes with **supertest**. Both inject **`pg-mem`** (in-memory Postgres) via `store._useTestPg(newDb().adapters.createPg())` + `await store.init()` before any query, so tests need no real database. For this to work, `server.js` exports `app` and only `init()`s + `listen()`s when run directly.
- **Frontend** (`client/`, jsdom env, config in `client/vite.config.js` `test` field, setup `client/src/test/setup.js`) — pure-unit tests for `lib/st`, `lib/badges`, `lib/routes`, plus `src/App.test.jsx`, an integration test that mocks `fetch`, renders `<App>` in a `MemoryRouter`, and asserts the dashboard loads cases, sidebar navigation works, and `/result/:id` deep-links render the stored analysis.

When changing an API response shape, update both the route in `server.js` and the matching expectation in `test/api.test.js`; the `App.test.jsx` `fetch` mock also encodes the payload shapes.

## React client architecture (`client/`)

- **`src/store.jsx`** — the single source of truth. `AppProvider` holds all state in a `useReducer` (`patch`-style reducer) and exposes actions via `useApp()` (`go`, `openCase`, `analyze`, `setFilter`, `saveContext`, `toggleContext`, `send`, …). Async actions (data loaders, `analyze`, referral) live here and call the API. On mount it `loadCases()` + `loadContext()`.
- **Routing** — `react-router-dom`. `src/App.jsx` holds the `<Routes>` (`/`, `/upload`, `/result`, `/result/:id`, `/cases`, `/context`, `/handoff`). `src/lib/routes.js` maps screen keys ↔ paths (`pathFor`, `screenFromPath`); `navDef`/`titles` stay keyed by screen. The store's `go(screen)` / `openCase(id)` / `analyze()` call `useNavigate()`; `Sidebar`/`Topbar` derive the active screen from `useLocation()`. `Result` reads `:id` via `useParams()` and calls `ensureCase(id)` in an effect, so deep links and back/forward work. `server.js` has an SPA fallback (`app.get("*")`) that serves `public/index.html` for non-`/api` GETs.
- **`src/App.jsx`** — shell (`Sidebar` + `Topbar` + `<main>` with `<Routes>`). Overlays (`AnalyzingOverlay`, `AddContextModal`) render at the shell level so they persist across routes.
- **`src/components/`** — one component per screen: `Dashboard`, `Upload`, `Result`, `Cases`, `ContextScreen`, `Handoff`, plus `Sidebar`, `Topbar`, `AnalyzingOverlay`, `AddContextModal`.
- **`src/lib/`** — `st.js` (the key porting trick: parses the design's inline CSS strings into React style objects, so `style={st("color:#fff;...")}` carries the original styling verbatim), `badges.js` (`riskBadge`/`statusBadge`/`dimColor`), `data.js` (`navDef`, `titles`, `ctxTypes`, offline-fallback seed arrays).
- **`Result`** branches on `state.viewAnalysis` (the stored AI analysis for the open case) vs. the static SlimX mock — same logic as the vanilla version.
- **Responsive** — `src/styles.css` is a copy of the root `styles.css` (same media-query strategy), except the shell selector is `#root-shell` because in React `#root` is the Vite mount node.

## Vanilla front-end (root, reference)

- **`app.js`** — single `state` object + `app` action methods + `render()` that rebuilds `#root` innerHTML on every change (vanilla port of the design's `renderVals()`). Screens switch on `state.screen`. `resultHTML()` branches on `ai` (`state.viewAnalysis`) to render live data vs. the static SlimX mock.

## Authentication

Session auth via a **JWT in an httpOnly cookie** (`adguard_token`), passwords hashed with **bcryptjs**, users in the Postgres `users` table.

- **`db.js`** — `users` table + `getUserByEmail`/`getUserById`/`createUser`. On first run, seeds one admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (defaults are dev-only).
- **`server.js`** — `requireAuth` middleware (verifies the cookie JWT, signed with `JWT_SECRET`). Public: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `/healthz`, static/SPA. **All data routes (`/api/cases*`, `/api/context*`, `/api/analyze`) require auth.**
- **Client** — `store.jsx` holds `user`/`authChecked`; `checkAuth()` runs on mount (`GET /api/auth/me`), `login()`/`logout()` hit the auth API. `App.jsx` gates: splash while checking → `<Login/>` when logged out → the app when authed. `Sidebar` shows the user + a logout button. Same-origin cookies are sent automatically.
- **Env** — `JWT_SECRET` (required in prod), `ADMIN_EMAIL`, `ADMIN_PASSWORD`. On Render, `JWT_SECRET` uses `generateValue: true`.

## Backend

- **`server.js`** — REST API (auth-protected, see above):
  - `POST /api/analyze` — builds a Thai อย.-style system prompt, sends text or base64 image to Claude, constrains the response with a JSON schema (`ANALYSIS_SCHEMA`) mirroring the result-screen fields, **saves the result as a new case**, and returns `{ ...result, caseId }`. Active "บริบท AI" items are passed as extra context.
  - `GET /api/cases?filter=` + `GET /api/cases/:id` — list (with status counts) / fetch one (incl. stored `analysis`).
  - `POST /api/cases/:id/refer` — record an inter-agency referral, flips status → `referred`.
  - `GET/POST /api/context` + `PATCH /api/context/:id/toggle` — knowledge-base CRUD.
- **`db.js`** — Postgres via `pg` (node-postgres). Connects with `DATABASE_URL` (Supabase; SSL auto-enabled for non-localhost hosts). `init()` creates the schema (`cases` with `analysis_json`/`referral_json` `jsonb` columns + `context_items`) and seeds on first run; **all query helpers are `async`**. Column names are snake_case (`risk_th`, `status_th`, `case_date`) and mapped back to the camelCase API shape (`riskTh`, …) in `mapCaseRow`/`mapContext`, so the API output is unchanged. `nextCaseId()` generates sequential `AD-2026-####` ids. `server.js` calls `await store.init()` before `listen()`. `_useTestPg()` lets tests inject an in-memory Postgres.
- **Frontend data flow** — `app.js` loads `allCases` + `state.contextItems` from the API on startup (seed arrays are an offline fallback). `openCase(id)` fetches the stored analysis into `state.viewAnalysis`, which `resultHTML()` renders. Context add/toggle and referrals POST/PATCH to the API.

## Responsive layout

The UI is built from inline styles, so responsiveness lives in `styles.css` media queries (`@media max-width: 860px` / `520px`) that override structure with `!important`:
- **Attribute selectors** match the inline grid templates directly — e.g. `[style*="repeat(4,1fr)"]` collapses stat grids — so individual elements don't need editing.
- A few **class hooks** added in `app.js`'s `render()` handle the rest: `.sidebar`/`.sidebar-nav`/`.nav-btn`/`.nav-label` (sidebar → horizontal icon+label bar, EN sub-labels hidden), `.topbar-search`/`.topbar-sub`/`.topbar-cta-text` (hidden on small), `.hscroll` + `.wide-row` (data tables scroll horizontally instead of squashing).

When adding a new grid, reuse an existing inline template string (e.g. `repeat(3,1fr)`, `1fr 1fr`) so the media queries pick it up automatically; otherwise add a class hook + rule.

## Architecture

### Claude Design Component Format (`.dc.html`)

The prototype uses a custom template format:

- `<x-dc>` — root wrapper parsed by `support.js`
- `<helmet>` — injected into `<head>` (fonts, global CSS)
- `<sc-if value="{{ expr }}">` — conditional rendering
- `<sc-for list="{{ arr }}" as="item">` — list rendering
- `{{ expr }}` — interpolation in attributes and text
- `style-hover="…"` / `style-focus-within="…"` — pseudo-class style helpers

### State Machine (inside `<script type="text/x-dc">`)

All logic lives in a single `class Component extends DCLogic`. Key methods:

- `state = { screen, inputMode, analyzing, … }` — all app state
- `renderVals()` — called on every state change; returns a flat object of all template bindings (no direct DOM manipulation)
- `go(screen)` — navigate between the 6 screens
- `analyze()` — fake AI analysis with `setTimeout` progress ticks

### Screens (controlled by `state.screen`)

| `screen` value | Description |
|---|---|
| `dashboard` | Stats, weekly chart, recent cases |
| `upload` | Input form (URL / file / image), analysis trigger |
| `result` | AI analysis output: highlighted violations, risk score, legal references |
| `cases` | Filterable case database table |
| `context` | AI knowledge base management |
| `handoff` | Inter-agency referral form |

### Design Tokens

- **Fonts**: IBM Plex Sans Thai (UI) + IBM Plex Mono (IDs, codes, stats)
- **Primary green**: `#157347` (buttons), `#2f9e6a` (active/accent), `#0f3026` (sidebar bg)
- **Risk colors**: high `#d64545`, medium `#e0a92e`, low `#2f9e6a`, clear `#6b7d75`
- **Background**: `#eef2f0` (page), `#fff` (cards)
- **Language**: Thai primary, English secondary (bilingual labels)
