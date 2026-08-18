# Sentinel — Incident Tracker

A Jira-style incident tracker: report incidents, run the response on a kanban
board, and watch the reliability numbers move as you work.

Built with **Next.js 16 (App Router)**, **shadcn/ui**, **Tailwind CSS v4**,
**Framer Motion** (`motion`), **dnd-kit** and **Recharts**.

## What is in it

| Route | What it does |
|---|---|
| `/login` | Dummy sign-in — any email, or one click on a demo account |
| `/dashboard` | Open/critical counts, MTTA, MTTR, reported-vs-resolved, severity mix, an SLA-ranked "needs attention" list, and a live activity feed |
| `/board` | Drag-and-drop kanban across Triage → Investigating → Mitigating → Monitoring → Resolved, filterable by severity, service and assignee |
| `/incidents` | Filterable, sortable table of every incident |
| `/incidents/[id]` | Timeline, comments, severity/status/assignee controls, and the response clock |
| `/analytics` | 7/30/90-day windows: trends, per-service reliability and responder load, each chart backed by a table |
| `/team` | Per-responder queues and per-service health |
| `/settings` | Theme, account switching, severity targets, demo-data reset |

Plus a ⌘K command palette, light/dark/system theming, and toast feedback on
every mutation.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Sign in with any email, or pick one of the demo accounts on the login screen.
The app seeds itself with ~24 incidents spread over the last quarter the first
time it loads.

```bash
npm run build && npm start   # production build
npm run lint                 # eslint
npx tsc --noEmit             # typecheck
```

## Auth is a stub — deliberately

There is no password check and no server session. A session is a user id in
`localStorage`, and everything the app needs flows through `useAuth()` in
[`src/lib/auth.tsx`](src/lib/auth.tsx):

```ts
const { user, users, ready, signIn, signInWithEmail, signOut } = useAuth();
```

To wire up real auth (NextAuth, Clerk, your own API), replace that one file so
`useAuth()` returns a real session, and move the `useRequireAuth()` redirect
into `middleware.ts`. No other file imports the session directly.

## Data is a stub too

Incidents live in a Zustand store persisted to `localStorage`
([`src/lib/store.ts`](src/lib/store.ts)), so the app hosts anywhere with no
database to provision. Every mutation goes through a named action —
`createIncident`, `updateIncident`, `moveIncident`, `addComment`,
`deleteIncident` — so swapping the store for API calls is a change to one file.

Reset the seed data any time from **Settings → Demo data**.

## Hosting

**Vercel / Netlify** — import the repo, no configuration needed. Everything is
static or client-rendered except `/incidents/[id]`, which is server-rendered on
demand.

**Node** — `npm run build && npm start`, listening on `$PORT` (default 3000).

**Docker**

```bash
docker build -t sentinel .
docker run -p 3000:3000 sentinel
```

The image uses Next's `standalone` output (enabled by `NEXT_OUTPUT=standalone`
at build time), so the runtime layer carries only the server bundle.

## Design notes

- **Severity is a status signal, not a series color.** SEV1–SEV4 use a fixed
  four-step status palette in both themes, and always ship as dot + label so
  the meaning never rests on color alone.
- **Chart series use a validated categorical palette** — checked for
  colorblind separation and surface contrast in light *and* dark, with the dark
  steps chosen for the dark surface rather than flipped from the light ones.
  Every chart with two or more series carries a legend, and each analytics
  chart is paired with the table of the same numbers.
- **Severity carries a response target** (SEV1 1h → SEV4 3d). The board, the
  dashboard and the incident page all show how much of that window is gone, and
  the clock ticks live via a shared `useNow()` store.

## Project layout

```
src/
  app/
    (app)/            authenticated shell — dashboard, board, incidents, analytics, team, settings
    login/            dummy sign-in
  components/
    ui/               shadcn/ui primitives
    board/            kanban column + draggable incident card
    dashboard/        stat tiles, chart card, charts
    incidents/        report-incident dialog
    layout/           sidebar, topbar, command palette, page header
  lib/
    auth.tsx          the auth stub — replace this for real auth
    store.ts          zustand store, persisted to localStorage
    seed.ts           deterministic demo dataset
    metrics.ts        MTTA/MTTR/SLA/trend math
    types.ts          domain model, severity and status metadata
    motion.ts         shared animation presets
```
