# Sentinel — Incident Tracker

A Jira-style incident tracker: report incidents, run the response on a kanban
board, and watch the reliability numbers move as you work.

Built with **Next.js 16 (App Router)**, **shadcn/ui**, **Tailwind CSS v4**,
**Framer Motion** (`motion`), **dnd-kit** and **Recharts**.

## What is in it

| Route | What it does |
|---|---|
| `/login` | Dummy sign-in — any email, or one click on a demo account |
| `/dashboard` | Open/critical counts, MTTA, MTTR, reported-vs-resolved, priority mix, a target-ranked "needs attention" list, and a live activity feed |
| `/board` | Drag-and-drop kanban across Triage → Investigating → Mitigating → Monitoring → Resolved, filterable by priority, service and assignee (the avatar strip filters in one click) |
| `/incidents` | Sortable table of every incident, filterable by search, status, priority, service and assignee |
| `/incidents/[id]` | Rich-text timeline and comments, evidence (call IDs + attachments), priority/status/assignee/ETA controls, and the response clock |
| `/analytics` | **Admin only.** 7/30/90-day windows: trends, per-service reliability and workload per person, each chart backed by a table |
| `/team` | Per-person queues and per-service health; resolved/MTTR stats are admin only |
| `/settings` | Theme, account switching, priority targets, demo-data reset |

Plus a ⌘K command palette, light/dark/system theming, and toast feedback on
every mutation.

## Domain model

Incidents are filed against one of five services — **Frontend**, **Backend**,
**Database**, **Prompt**, **Config** — and carry a priority from **P1** to
**P4**. Each priority has its own response target, which the board, dashboard
and incident page all count down against:

| Priority | Meaning | Response target |
|---|---|---|
| P1 | Critical — all hands | 1h |
| P2 | High — major degradation | 4h |
| P3 | Medium — limited impact | 1d |
| P4 | Low — cosmetic or tracked | 3d |

Both lists live in code, not a database: services in
[`src/lib/seed.ts`](src/lib/seed.ts) and priorities in
[`src/lib/types.ts`](src/lib/types.ts).

A report also captures a free-text **ENV**, any number of **bot call IDs** and
**VoiceStack call IDs**, and **screenshots or files**. Reporter and assignee are
both pickable — filing on someone else's behalf is recorded in the timeline as
"reported … (filed by …)".

### Access levels

Two levels, `admin` and `user`, set per account in
[`src/lib/seed.ts`](src/lib/seed.ts). Everyone can report and work incidents;
admins additionally get:

| Capability | User | Admin |
|---|:--:|:--:|
| Report, edit, assign and resolve incidents | ✅ | ✅ |
| Dashboard, board, incidents, team | ✅ | ✅ |
| Analytics page | — | ✅ |
| Per-person resolved/MTTR stats on Team | — | ✅ |
| Delete an incident | — | ✅ |
| Reset demo data | — | ✅ |

The matrix lives in [`src/lib/permissions.ts`](src/lib/permissions.ts) — call
sites ask `can(user, "view-analytics")` rather than comparing roles, so adding
a third level is a change to that one table. Hiding a nav entry is not a
control on its own, so gated pages also check the capability themselves via
`<RequireCapability>`.

Ava and Kai are admins in the demo data; the other four are users. Switch
between them in Settings to see the difference.

### Rich text in descriptions and comments

Descriptions and comments accept a small markdown subset — fenced code blocks,
inline code, images, links, bold and italic. Paste or drop a screenshot into
either and it is embedded inline; the toolbar inserts a code fence, and a
preview toggle shows the rendered result.

The value stored is plain text, so a real backend can take it unchanged.
[`src/lib/richtext.ts`](src/lib/richtext.ts) parses it to tokens and
[`src/components/rich-text.tsx`](src/components/rich-text.tsx) renders those as
React elements — nothing goes through `dangerouslySetInnerHTML`, and link and
image URLs are restricted to `http(s)`, `mailto:` and the internal `att:`
scheme, so pasted text cannot inject markup or a `javascript:` href.

Images embedded in a description are not repeated in the Evidence gallery — the
gallery lists only attachments that are not already rendered inline.

### ETAs

The assignee (or an admin) can put an ETA on an incident from the response
clock, and clear it again. It shows as a countdown there, as a chip on the
board card, as a column in the incident list, and every change lands in the
timeline. Once resolved, the ETA reports whether it was met.

### Where attachments live

The incident record holds only file metadata. The bytes go to **IndexedDB**
([`src/lib/attachments.ts`](src/lib/attachments.ts)) because localStorage caps
out around 5MB and one screenshot can spend most of that. Nothing outside that
module touches the blobs, so pointing attachments at object storage later is a
four-function change.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Sign in with any email, or pick one of the demo accounts on the login screen.
The app seeds itself with 29 incidents across the five services, spread over
the last quarter, the first time it loads.

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

- **Priority is a status signal, not a series color.** P1–P4 use a fixed
  four-step status palette in both themes, and always ship as dot + label so
  the meaning never rests on color alone.
- **Chart series use a validated categorical palette** — checked for
  colorblind separation and surface contrast in light *and* dark, with the dark
  steps chosen for the dark surface rather than flipped from the light ones.
  Every chart with two or more series carries a legend, and each analytics
  chart is paired with the table of the same numbers.
- **Priority carries a response target** (P1 1h → P4 3d). The board, the
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
    metrics.ts        MTTA/MTTR/response-target/trend math
    types.ts          domain model, priority and status metadata
    motion.ts         shared animation presets
```
