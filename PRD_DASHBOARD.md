# PRD: Dashboard Workspace (sidebar, docked chat, interactive Jalur bukti)

| | |
|---|---|
| Version | 0.1 draft |
| Date | 9 October 2026 |
| Builds on | [PRD_DECISION_MAKER_DISCOVERY.md](PRD_DECISION_MAKER_DISCOVERY.md) (discovery logic, evidence model, acceptance tests AT-01 to AT-08) |
| Status | Ready for build. Open questions are listed in §14 |

## 1. Overview

**Feature name:** Dashboard Workspace

**Problem statement:**
`/dashboard` looks like a landing page today. It uses the marketing top nav and footer and lays every section out as one long page. Sales and the judges have to scroll to reach the evidence graph, and that graph is a static SVG: it can't be zoomed, panned, filtered or explored. A chat backend that queries Neo4j already exists (`/api/chat`), but no page shows it. Questions the discovery screen can't answer therefore have nowhere to go.

**Proposed solution:**
The dashboard becomes an app-style workspace with three parts:

- **Left sidebar:** navigation and an account switcher.
- **Main content:** account views split into tabs.
- **Docked chat panel on the right:** it knows which account is open and can answer with tables, charts, small graphs and clickable citations.

Jalur bukti becomes a pan/zoom/select graph built on React Flow.

**AI build summary:**

> In the existing Next.js 16 App Router app (Tailwind 4, dark theme only, Prisma/Postgres, Neo4j, Gemini via `@google/genai`), do the following:
>
> 1. Move the marketing nav and footer into a `(site)` route group so `/dashboard` gets its own layout.
> 2. Build a three-column dashboard shell: collapsible sidebar, main area, and a collapsible docked chat panel. The chat panel persists across dashboard routes.
> 3. Split the discovery page into URL-driven tabs (`?tab=overview|graph|people|precedents`).
> 4. Rewrite `src/components/evidence-graph.tsx` on `@xyflow/react`:
>    - Pan, zoom, drag, minimap and fit view.
>    - Click a node or edge to highlight it and show its evidence in a side panel.
>    - Filter by origin and node kind, plus a "main path only" toggle.
>    - Full keyboard access and a table fallback.
> 5. Extend `POST /api/chat`:
>    - It accepts `{ accountId, asOf, selectedNodeId }` as context.
>    - It requires a session.
>    - It returns `visuals` (graph, table, bar or line), built on the server from real Cypher rows through a second Gemini tool, `show`.
>    - It returns `cites`, the IDs found in the answer and checked against the dataset.
> 6. Draw charts with plain SVG. Do not add a chart library. Do not add database tables.
> 7. Keep acceptance tests AT-01 to AT-07 in `scripts/check-discovery.mts` passing.

## 2. Goals & Success Metrics

**Primary goal:** A judge or salesperson goes from "who decides at this account?" to the source row behind the answer without leaving the dashboard or opening a CSV.

**Success metrics:**
- From an account's Overview tab, the source record (file:row) behind the decision maker opens in **≤ 2 clicks**.
- **5 of the 6** starter chat questions return at least one visual or citation chip, measured on the seeded dataset.
- A keyboard-only run of the demo works end to end: switch account, open the graph, select a node, read its evidence and ask the chat.

**Anti-goals:**
- Not building a general BI tool. The chat draws only what one read-only Cypher result already holds.
- Not letting the LLM decide evidence status, names or numbers. Visuals and citations come from server-validated data only.
- Not a graph editor. Users can't create, delete or connect nodes.
- Not a light theme.

## 3. Scope & Constraints

**In scope:**
- Dashboard layout and shell, separate from the landing layout
- Sidebar: navigation, account switcher and user menu
- Discovery page split into tabs
- Interactive Jalur bukti graph
- A `/dashboard/decisions` page that reuses `Dictionary` and `dictionaryEntries()`
- Docked chat that knows the current account, renders visuals and cite chips, and links back to the graph
- Restyling `chat.tsx` to the dark tokens. It still uses `bg-white` and a `bg-night` token that doesn't exist.

**Out of scope:**
- Saved chat history in the DB
- Sharing conversations
- Expanding graph neighbours from Neo4j inside Jalur bukti (Phase 2)
- Saving node positions
- Sales notes input (AT-08)
- Streaming chat responses

**Technical constraints:**
- **Platform:** web only, desktop first. It must be usable at 375px.
- **Auth:**
  - Use the existing email/password session (`currentUser()`). Every dashboard page and `/api/chat` requires a session.
  - Check auth in each page and route handler, not only in the layout. A layout doesn't re-run on client navigation (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`).
- **Accessibility:** WCAG 2.2 AA.
- **Offline:** no.
- **Performance:**
  - The graph tab is interactive within 1s for an account graph of ≤ 100 nodes.
  - Chat shows its pending state within 100ms. Answers may take up to 60s; the route already caps it at 4 model steps.
- **LLM limits:**
  - Gemini free tier allows 5 requests per minute per model, so the UI must show quota errors with a retry.
  - The existing per-IP limit of 8 requests per minute stays.

## 4. Jobs to Be Done

| Priority | Job statement |
|---|---|
| J1 | When I prepare a call with a prospect, I want to see who decides and what to do next at a glance, so I approach the right person first. |
| J2 | When I or a judge doubt a conclusion, I want to trace it through the graph to the source row, so I can trust it or reject it. |
| J3 | When a question isn't answered on screen, I want to ask it in plain language and get data back, not prose only, so I don't open CSVs or write Cypher. |
| J4 | When I compare several accounts or decisions, I want to switch between them quickly, so the context isn't lost. |

## 5. User Stories

| ID | Role | Action | Benefit | JTBD |
|---|---|---|---|---|
| US1 | Sales Exec | Move between Discovery, Decisions and accounts from a persistent sidebar | I never return to the landing page to navigate | J4 |
| US2 | Sales Exec | Pan, zoom, filter and select in Jalur bukti | I see why a person is the decision maker, not only that they are | J2 |
| US3 | Judge | Open the source record behind any node or edge | I can verify every claim | J2 |
| US4 | Sales Exec | Ask the chat about the account I'm viewing, without retyping its ID | Answers fit my context | J3, J1 |
| US5 | VP Sales | Ask an aggregate question and get a table or chart | I see patterns, such as discounts above 10%, at a glance | J3 |
| US6 | Sales Exec | See a small graph in a chat answer and open it in Jalur bukti | Chat findings and the main graph stay connected | J2, J3 |
| US7 | Keyboard or screen reader user | Use the sidebar, graph and chat without a mouse | The demo is accessible | J1 to J4 |
| US8 | Any user on a narrow screen | Use the dashboard at 375px | It works on a phone or a split screen | J1 |

## 6. Proposed Experience

**Design direction:**
The landing page is cinematic: glitch display font, scroll motion, wide sections. The dashboard should be the quiet opposite, a tool you work in. It follows a workspace mental model (Linear or a database console): navigation on the left, the object in the middle, an assistant on the right.

- Reuse the existing tokens: page `#08080a`, panel `#131316`, line `#ffffff24`, accent `#00c758`.
- Use `font-display` only for the page title and the decision maker's name on the focal card. Use system sans everywhere else.
- Use `shadow-bubble` only on the decision maker card.
- No scroll animations. Only 150ms colour and opacity transitions, and none when `prefers-reduced-motion` is set.
- Dense 8px spacing grid, 14px body text in panels, `tabular-nums` for money.

**Layout, ≥ 1280px:**

```
┌──────────┬──────────────────────────────────────────┬────────────────┐
│ Decidely │ P01 · Grup Ritel Mandala   [asof ▾]      │ Chat      [×]  │
│ [Search ▾]│ Overview  Jalur bukti  Stakeholders  Pres│ ────────────── │
│          │ ┌─────────────────────┐ ┌──────────────┐ │ Context: P01   │
│ ◆ Disc.  │ │ Rina Hapsari  ●     │ │ Rp252.000.000│ │                │
│ ▤ Decis. │ │ Lintas sumber       │ │ /tahun       │ │ > siapa ...    │
│          │ └─────────────────────┘ └──────────────┘ │ [table/chart]  │
│ Prospek  │ Langkah berikutnya   │ Belum diketahui   │ [D-2025-11]    │
│  P01 P02 │                                          │                │
│ ──────── │                                          │ [ask…] [Send]  │
│ user ⏻   │                                          │                │
└──────────┴──────────────────────────────────────────┴────────────────┘
 240px (64px when collapsed)      fluid                    380px (hideable)
```

- **1024 to 1279px:** the chat becomes a right-hand drawer over the content, opened from a "Chat" button in the header.
- **< 1024px:** the sidebar becomes a top bar with a menu drawer. The chat opens as a full-screen sheet.

**Key screens and states:**
- **Discovery, no account selected (empty state):**
  - Shows "Pick a prospect": the prospect list from `Prospects`, plus a search box.
  - The chat shows global starter questions.
- **Discovery › Overview:** the decision maker card (focal), the deal value card, next steps and unknowns.
- **Discovery › Jalur bukti:**
  - A full-height graph canvas (`calc(100dvh - header)`) with a toolbar.
  - An evidence side panel (320px, collapsible) on the right edge of the canvas card.
- **Discovery › Stakeholders:** the existing table. **Discovery › Preseden:** the existing list.
- **Decisions:** the `Dictionary` component (filter by type), restyled for the panel layout. Its `AskButton` now opens the docked chat.
- **Unknown account:** the existing alert ("Akun dari … tidak dikenali") plus the prospect list.
- **Dataset not readable:** the existing `role="alert"` message, shown in the main area. The sidebar stays usable.
- **Loading:**
  - `dashboard/loading.tsx` shows a skeleton of the header, two cards and the tab bar.
  - The graph tab shows the canvas outline with a spinner until React Flow mounts.
  - The chat shows "Querying the graph…" with a static icon when reduced motion is on.
- **Chat errors** use the existing messages (quota, overloaded, not configured, too many queries) in an alert with an "Ask again" button. When the chat isn't configured, the panel shows a setup note instead of the input.
- **Chat 401** (session expired): "Your session ended. Log in again." with a link to `/login`.

**Interaction model:**

Primary flow for J1 and J2:
1. Log in and land on `/dashboard`. Pick P01 in the sidebar switcher. The URL becomes `/dashboard?q=P01&asof=2026-10-01`.
2. Overview shows Rina Hapsari, "Teridentifikasi lintas sumber". Click "Lihat jalur bukti" on the card to open `?tab=graph`, with the main path pre-selected.
3. Click the I0343 node. Its incident edges and neighbours stay at full opacity and everything else dims to 25%. The evidence panel lists that node's sources.
4. Click "Tanya chat tentang ini" on an evidence card. The chat input fills with a question about that record and sends.

Graph controls:

| Action | Mouse or touch | Keyboard |
|---|---|---|
| Pan | Drag the background | Arrow keys when the canvas has focus and no node is selected |
| Zoom | Wheel or pinch, Controls + / − | `+` / `-` |
| Fit view | Controls button | `f` |
| Select a node or edge | Click | Tab to it, then Enter or Space |
| Clear selection (back to the main path) | Click the background | Escape |
| Move a node | Drag | Arrow keys with a node selected (React Flow built-in; Shift moves faster) |
| Reset layout | Toolbar button | Toolbar button |

Toolbar:
- **Main path only** toggle: show only edges that carry `focusEvidence`, and their nodes.
- **Origin filter chips** (4) and **node kind filter chips**. A filtered-out element is hidden, not just dimmed.
- **Graph | List** toggle.
- **Reset layout.**

Chat:
- Enter sends. Shift+Enter adds a new line (the input becomes a textarea).
- Starter questions follow the context. With an account open they are, for example, "Siapa pemutus pengadaan di {name}?", "Preseden apa yang relevan untuk {id}?" and "Siapa yang perlu didekati berikutnya?". With no account open, the existing `QUESTIONS` are used.
- The context chip "Context: P01 · 1 Okt 2026" sits above the input and can be removed for one question.

Chat visuals:
- Each visual has "Expand", which opens a full-screen dialog.
- Mini graphs also get "Highlight in Jalur bukti" when at least one node ID exists in the current account graph. It navigates to `?tab=graph&focus=id1,id2`.
- Clicking a cite chip:
  - An account ID navigates to that account.
  - Any other ID opens a record drawer showing the file, row and fields.

Undo and redo: none. "Reset layout" is the only undo for dragged nodes.

**Accessibility notes:**
- **Landmarks:** `nav` (sidebar), `main`, and `aside aria-label="Chat"`. The tabs are links with `aria-current="page"`, not ARIA tabs, because each one is a URL.
- **Graph:**
  - Set `nodesFocusable` and `edgesFocusable`, and give each node and edge an `aria-label` that reuses today's text, for example "{type}: {from} ke {to} ({origin})".
  - Set `ariaLabelConfig` so React Flow's built-in descriptions are in Indonesian.
  - The selection summary sits in an `aria-live="polite"` region ("3 sumber terpilih dari 12").
- **Table fallback:** the "List" view shows every visible edge as a table (From, Relasi, To, Asal, Sumber) with the same select behaviour. It's the screen reader path, so it must hold the same information as the canvas.
- **Edge origin is not shown by colour alone:** keep the dash patterns from the current `STROKE` map and the legend.
- **Chat:** the log is `role="log"`. Charts get `role="img"` with an `aria-label` that summarises them ("Bar chart: discounts by approver, highest Budi 4"). Every chart has a "Show as table" toggle.
- **Contrast:** muted text `#a1a1aa` on `#131316` is ≈ 7:1, which passes. The accent `#00c758` is used as a fill only behind black text, and must not be used for small text on panels.
- **Focus:** visible 2px white outline (already global). When the chat drawer or sheet closes, focus returns to the "Chat" button.
- **Language:** set `lang="id"` on the dashboard shell, because the UI copy is Indonesian. Chat messages keep the user's language.

**Figma / design link:** none yet. `design/` holds the basedash reference.

## 7. Component Inventory

| Component | Type | Description | Stories |
|---|---|---|---|
| `DashboardShell` | Layout | Client component. Three-column grid with the collapse state for the sidebar and the chat. Provides `ChatProvider`. | US1, US8 |
| `AppSidebar` | Navigation | Logo, `AccountSwitcher`, nav links (Discovery, Decisions), a quick list of prospects, the user name and Log out (the `logout` action). Collapses to a 64px icon rail; collapsed items show the name on focus and hover. | US1, US7 |
| `AccountSwitcher` | Form | A combobox over `accountOptions()` that filters by ID or name. Selecting an account navigates to `?q=ID` and keeps `asof`. Built on native `<input list>` plus a button, as today. | US1 |
| `AccountHeader` | Display | ID, name, industry and city, the as-of `<input type="date" max={SNAPSHOT}>`, and the "Chat" button below 1280px. | US1 |
| `DiscoveryTabs` | Navigation | Four links bound to `?tab=`. Server-rendered. | US1, US7 |
| `DecisionMakerCard` | Display | The focal card with `shadow-bubble`: status mark, name, why, first step, and a "Lihat jalur bukti" link. | US2 |
| `EvidenceGraph` | Display | React Flow canvas with a custom node (kind label, focus ring, status), a custom edge (dash by origin), `MiniMap`, `Controls` and `Background`. Has a `compact` prop for chat (read-only, no minimap). | US2, US3, US6, US7 |
| `GraphToolbar` | Action | Main-path toggle, origin chips, kind chips, Graph/List toggle, Reset. | US2 |
| `EvidencePanel` | Display | The evidence list for the selection: label, `file:row · column · date`, origin and excerpt, plus "Tanya chat tentang ini". A bottom sheet below 1024px. | US3 |
| `EdgeTable` | Display | Table fallback for the graph. | US7 |
| `Chat` (restyled) | Layout | Docked panel or sheet: log, starter questions, context chip and input. Keeps the `AskButton` event bridge. | US4, US5 |
| `ChatVisual` | Display | Switches on `visual.kind` to `MiniGraph` (`EvidenceGraph compact`), `DataTable`, `BarChart` or `LineChart`. Each has Expand and Show-as-table. | US5, US6 |
| `DataTable` | Display | Sortable by header click (`aria-sort`). At most 50 rows; a footer shows "50 of 214 rows". | US5 |
| `BarChart`, `LineChart` | Display | Plain SVG, axis labels, value labels on hover and focus. | US5 |
| `CiteChip` | Action | Inline button for a validated ID. | US3, US4 |
| `RecordDrawer` | Modal | Native `<dialog>` showing the cite's file, row and fields. | US3 |

## 8. Data Models

No database or schema changes. New TypeScript types: put the chat types in `src/server/chat-visuals.ts` and extend the graph types in `src/server/discovery.ts`. Client files use `import type` only.

```typescript
// discovery.ts: widen the node kinds so chat graphs can show other labels (Tiket, Kontrak, …)
type NodeKind = "account" | "person" | "deal" | "employee" | "interaction" | "decision" | "feature" | "other";
interface GraphNode { id: string; label: string; kind: NodeKind; focus?: boolean }
interface GraphEdge { from: string; to: string; type: string; origin: Origin; evidence: string[] } // unchanged

// Sent by the client with every chat request.
interface ChatContext {
  accountId?: string;      // /^[A-Z]{1,3}\d{2,3}$/, must exist in dataset().accounts
  asOf?: string;           // YYYY-MM-DD, ≤ SNAPSHOT
  selectedNodeId?: string; // id of the selected Jalur bukti node, if any
}

type Visual =
  | { kind: "graph"; title: string; nodes: GraphNode[]; edges: GraphEdge[] }          // ≤ 60 nodes; edges from Neo4j have origin "record", evidence []
  | { kind: "table"; title: string; columns: string[]; rows: string[][]; total: number } // ≤ 50 rows
  | { kind: "bar" | "line"; title: string; x: string; y: string; points: { x: string; y: number }[] }; // bar ≤ 24, line ≤ 60 points

interface Cite {
  id: string;              // as written in the answer, e.g. "D-2025-11", "I0343", "P01"
  kind: NodeKind;
  label: string;           // nama / subjek / id
  file: string;            // e.g. "decision_log.csv"
  row: number;             // 1-based data row, same convention as Evidence.row
  fields: Record<string, string>; // the row, long text cut to 500 chars
}

interface ChatResponse {
  answer: string;
  queries: { cypher: string; rows: number; error?: string }[];
  seconds: number;
  visuals: Visual[];       // ≤ 2 per answer
  cites: Cite[];           // only IDs found in the dataset; unknown IDs stay plain text
}

// Client only (ChatProvider)
interface Msg { role: "user" | "assistant"; content: string; queries?: ChatResponse["queries"]; seconds?: number; visuals?: Visual[]; cites?: Cite[] }
```

## 9. API / Integration Surface

| Method | Path | Description | Auth | Response |
|---|---|---|---|---|
| GET | `/dashboard?q&asof&tab&focus` | Discovery page. `tab` is one of `overview` (default), `graph`, `people` or `precedents`. `focus` is a comma list of node IDs to pre-select on the graph tab. | Session, else redirect to `/login` | HTML |
| GET | `/dashboard/decisions?kind` | Decision dictionary | Session, else redirect | HTML |
| POST | `/api/chat` | **Changed:** accepts `{ messages, context?: ChatContext }` and returns visuals and cites | **Session, new: 401 `{ error }` without one** | `ChatResponse` or `{ error }` with 400/401/422/429/503 |

How the `/api/chat` changes work:
- **Context:** the server re-validates `context` with zod and adds one line to `SYSTEM`:
  > "The user is viewing account {id} ({name}) as of {asOf}. Selected node: {id label}. Resolve 'this account', 'dia' and similar references with it."
- **New Gemini tool `show`:** `{ query: integer, kind: "graph"|"table"|"bar"|"line", title: string, x?: string, y?: string }`.
  - `query` is the 0-based index of a successful `cypher` call in this turn.
  - The server keeps raw records for each query during the request and builds the `Visual` from them. The model never sends data.
  - These cases are dropped and noted as `"visual skipped: <reason>"` in `queries`: an unknown index, a missing column, non-numeric `y`, or a graph request on a result with no nodes or relationships.
- **Graph extraction:** use `neo4j.isNode`, `isRelationship` and `isPath` on the raw records. Node `id` is `properties.id`. Map labels to kinds: `Akun→account, Kontak→person, Deal→deal, Karyawan→employee, Interaksi→interaction, Keputusan→decision, Fitur→feature`, anything else `other`.
- **Cites:**
  - After the final answer, the server scans the text with `/\b(?:D-\d{4}-\d{2}|DL-\d{3}|I\d{4}|[CP]\d{2}|…)\b/` (finish the pattern from the ID formats in `data/`).
  - Each match is looked up in `dataset()` and only the matches found there are returned.
- **Prompt rule** added to `SYSTEM`: "When a result is better seen than read (a list of more than 5 rows, counts per group, a trend over time, a set of connected entities), call `show` once for it."

**External integrations:**
- Gemini (`@google/genai`, `GEMINI_API_KEY`, `GEMINI_MODEL`). Existing.
- Neo4j (`neo4j-driver`, read-only session plus rolled-back transaction). Existing guards unchanged.
- **New dependency:** `@xyflow/react` (React Flow 12). Import `@xyflow/react/dist/style.css` once in the graph component and use `colorMode="dark"`.

## 10. State Management Map

| State | Location | Persistence | Notes |
|---|---|---|---|
| Account, as-of date, tab, graph focus | URL (`q`, `asof`, `tab`, `focus`) | Shareable | Server components read it. Back and forward work. |
| Discovery result | Server (`discover()` per request) | None | Already deterministic from the dataset. |
| Sidebar and chat collapsed | `DashboardShell` state plus `localStorage` (try/catch) | Per browser | Only a convenience. Defaults to open. |
| Chat messages | `ChatProvider` in the dashboard layout, mirrored to `sessionStorage` (try/catch) | Tab session | The layout persists across `/dashboard/*` navigation, so the conversation survives tab and account switches. |
| Chat context | Derived from the URL plus the graph selection, pushed to `ChatProvider` | None | Sent with each request. |
| Graph selection, filters, node positions | `EvidenceGraph` local state | None | Selection is seeded from `focus` or `focusEvidence`. Positions reset on reload. |
| Session | Cookie, `currentUser()` | Existing | Checked in each page and in `/api/chat`. |

## 11. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 16.4 App Router, React 19.3 | Existing. Route groups split the site and dashboard layouts. |
| Styling | Tailwind 4 `@theme` tokens in `globals.css` | Existing. No new tokens except, optionally, `--color-panel-2: #1a1a1e` for hover rows. |
| Graph UI | `@xyflow/react` | Built-in pan, zoom, drag, minimap and keyboard a11y (`nodesFocusable`, `edgesFocusable`, `ariaLabelConfig`). Writing these by hand costs more than the dependency. |
| Layout algorithm | The existing column layout (`COL_X`) as initial positions | Predictable left-to-right reading (interaction → person → account → decision). No dagre or elk. Add one only if expanded graphs overlap (Phase 2). |
| Charts | Plain SVG components | Only bar and line are needed, which is about 80 lines each. Add a chart library only if a third chart type is requested. |
| Chat | `/api/chat` with Gemini and the Cypher tool | Existing. Extended, not replaced. |
| Data | Postgres (Prisma) for auth, the in-memory CSV dataset for discovery and cites, Neo4j for chat | Unchanged. |
| Auth | Existing session cookie | Unchanged. |

## 12. Suggested File Structure

Route groups were checked in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`. URLs don't change.

```
src/
├── app/
│   ├── layout.tsx                    # html/body, font, TRPCReactProvider only; SessionNav + SiteFooter move out
│   ├── (site)/
│   │   ├── layout.tsx                # SessionNav + children + SiteFooter
│   │   ├── page.tsx                  # moved from app/page.tsx      (URL /)
│   │   ├── login/page.tsx            # moved                         (URL /login)
│   │   └── register/page.tsx         # moved                         (URL /register)
│   ├── dashboard/
│   │   ├── layout.tsx                # <DashboardShell accounts=…> around children, lang="id"
│   │   ├── loading.tsx               # skeleton
│   │   ├── page.tsx                  # discovery with ?tab; keeps the currentUser() redirect
│   │   └── decisions/page.tsx        # Dictionary + dictionaryEntries()
│   └── api/chat/route.ts             # + session check, context, `show` tool, visuals, cites
├── components/
│   ├── dashboard-shell.tsx           # client: grid, collapse state, ChatProvider
│   ├── app-sidebar.tsx
│   ├── account-switcher.tsx
│   ├── discovery-tabs.tsx
│   ├── evidence-graph.tsx            # rewritten on React Flow (custom node/edge, toolbar, panel, list view inside)
│   ├── chat.tsx                      # restyled docked panel + provider + AskButton
│   └── chat-visual.tsx               # MiniGraph / DataTable / BarChart / LineChart / RecordDrawer
└── server/
    ├── discovery.ts                  # NodeKind widened
    └── chat-visuals.ts               # rows → Visual, answer → Cite[]
```

Note: `Nav` (`src/components/nav.tsx`) keeps linking to `/dashboard`. Nothing in the dashboard imports `Nav` or `SiteFooter`.

## 13. Acceptance Criteria

**US1: Sidebar navigation**
- [ ] `/dashboard` and `/dashboard/decisions` render without the marketing `Nav` and `SiteFooter`. `/`, `/login` and `/register` still render them, at unchanged URLs.
- [ ] The sidebar shows Discovery and Decisions. The current route has `aria-current="page"`.
- [ ] Picking an account in `AccountSwitcher` navigates to `/dashboard?q={id}&asof={current asof}`.
- [ ] Collapsing the sidebar leaves a 64px rail, and the collapsed state is still there after a reload.
- [ ] Log out in the sidebar ends the session and lands on `/`.
- [ ] Visiting any `/dashboard*` URL without a session redirects to `/login`.

**US2: Interactive Jalur bukti**
- [ ] On `?q=P01&tab=graph`, the canvas fits all nodes on first render, and the main path (`focusEvidence`) is highlighted.
- [ ] Wheel, pinch and the Controls buttons zoom. Dragging the background pans. Dragging a node moves it, and Reset restores the column layout.
- [ ] Clicking a node dims every element not incident to it to ≤ 25% opacity, and lists exactly the evidence of its incident edges.
- [ ] Clicking the background or pressing Escape restores the main-path selection.
- [ ] Turning off origin `text_claim` hides every dashed-white edge and any node left without visible edges.
- [ ] "Main path only" shows only edges whose `evidence` intersects `focusEvidence`.
- [ ] `?focus=I0343` opens with I0343 selected.
- [ ] **Edge case, empty path:** on P03, where no decision maker is identified, the initial selection is "Semua sumber untuk akun ini" (as now) and no edge is wrongly highlighted.
- [ ] **Edge case, no people:** for an account with no people at the as-of date, the graph tab shows the account node alone with the text "Tidak ada kontak pada {tanggal}. Coba tanggal acuan lain."

**US3: Source record**
- [ ] Every evidence card shows `file:row · column`, and the date when present. The values match `Evidence` from `discover()`.
- [ ] From Overview, these two clicks show I0343's file and row: "Lihat jalur bukti", then the I0343 node.
- [ ] `npx tsx scripts/check-discovery.mts` still passes AT-01 to AT-07.

**US4: Chat that knows the account**
- [ ] The chat panel is visible next to the content at ≥ 1280px, and it keeps its messages when switching tabs or accounts within `/dashboard`.
- [ ] With P01 open, sending "siapa pemutusnya?" includes `context.accountId = "P01"` in the request body, and the answer refers to P01.
- [ ] `/api/chat` returns 401 without a session and 400 for an `accountId` that isn't in the dataset.
- [ ] The answer text renders matched IDs as `CiteChip`s. An ID not found in the dataset renders as plain text.
- [ ] Clicking chip `P03` navigates to `?q=P03`. Clicking `I0343` opens `RecordDrawer` with file, row and fields.
- [ ] **Error state:** a 429 from Gemini shows "Gemini quota reached…" and an "Ask again" button, and the user's question stays in the input history.
- [ ] **Error state:** without `GEMINI_API_KEY`, the panel shows the setup note and no input.

**US5: Table and chart answers**
- [ ] "Which discounts above 10% were approved, and by whom?" returns at least one `table` visual whose rows equal the rows of the referenced Cypher result (≤ 50, `total` correct).
- [ ] A `bar` or `line` visual only renders when the `y` values are numeric. Otherwise it is skipped and noted in the queries `<details>`.
- [ ] Each chart has a "Show as table" toggle and an `aria-label` summary.
- [ ] At most 2 visuals render per answer.

**US6: Mini graph to Jalur bukti**
- [ ] A `graph` visual renders as a read-only compact `EvidenceGraph` (≤ 60 nodes), fitted to view.
- [ ] "Highlight in Jalur bukti" appears only when at least one visual node ID is in the current account's graph. Clicking it navigates to `?tab=graph&focus=…`.
- [ ] "Expand" opens the visual in a full-screen `<dialog>`. Escape closes it and returns focus to the button.

**US7: Keyboard and screen reader**
- [ ] Tab order is: sidebar, header, tabs, graph toolbar, graph nodes and edges, evidence panel, chat.
- [ ] Each graph node and edge is reachable with Tab, has the `aria-label` defined in §6, and is selected with Enter or Space.
- [ ] The List view shows every visible edge in a `<table>` with headers, and selecting a row updates the evidence panel.
- [ ] axe reports no serious or critical violations on `/dashboard?q=P01&tab=graph`.

**US8: Narrow screens**
- [ ] At 375px there is no horizontal page scroll. The sidebar is behind a menu button and the chat opens as a full-screen sheet.
- [ ] The graph canvas fills the width and the evidence panel becomes a bottom sheet.

**Definition of done:** `npm run lint`, `npx tsc --noEmit` and `npm run build` pass.

## 14. Open Questions & Risks

- **Q:** Should the dashboard UI copy stay Indonesian? The chat starters and `Dictionary` are English today. The draft assumes Indonesian UI, with chat answers in the user's language. *Owner: PM*
- **Q:** The landing page's `AskButton` currently dispatches to a chat that no page renders. Should it link to `/dashboard/decisions` and the chat, or be removed? *Owner: Design*
- **Q:** Should "expand neighbours" (double-click a node to fetch its Neo4j neighbours) be in the demo? It needs a read-only neighbour query, and those edges have no file:row evidence (Neo4j stores no provenance). *Owner: Eng.* Proposed: Phase 2, with such edges styled as "graph-only, no row citation".
- **Risk:** Gemini may not call `show`, or may point it at the wrong query. *Mitigation:* the visuals are optional, the answer text still stands, and the prompt rule and two few-shot examples go in `SYSTEM`. Track success with metric 2.
- **Risk:** Free-tier quota (5 requests per minute). One chat answer can use up to 4 model calls, so a live demo can hit the limit. *Mitigation:* use a paid key for the demo and keep the visible retry.
- **Risk:** The cite regex may match strings that look like IDs inside prose. *Mitigation:* only IDs that exist in `dataset()` become chips.
- **Risk:** Moving the routes into `(site)` changes the layout tree, and a stale `.next` cache can show the old nav. *Mitigation:* restart the dev server after the move.
- **Tradeoff:** React Flow adds a dependency, but buys tested pan, zoom and keyboard a11y. Plain SVG charts avoid a second dependency, at the cost of only two chart types.
- **Tradeoff:** Chat history lives in `sessionStorage`, not the DB. It's lost when the tab closes, but needs no schema or retention policy.

## 15. Rollout & Next Steps

**MVP:**
- **Includes:** route-group split, shell, sidebar, account switcher, tabs, the React Flow Jalur bukti (select, filter, main path, list view, `focus`), the decisions page, the docked chat with context, cites, table, bar, line and mini graph, and the session check on `/api/chat`.
- **Excludes:** neighbour expansion, saved chat, streaming, sales notes, a node-detail page.

**Phase 2+:**
- Expand neighbours from Neo4j, with an auto-layout (elk) once graphs grow past the column layout.
- Stream chat tokens.
- Keep chat history per user in Postgres.
- "Pin to account": save a chat visual to an account's Overview.
- Sales notes input (AT-08) from the chat.

**Sign-off:** PM, Engineering lead, Design.

**Build order** (each step leaves the app working):
1. Route-group split and the empty `DashboardShell` with the sidebar and switcher. The existing discovery content moves into the main column.
2. Tabs, and the overview cards restyled.
3. `EvidenceGraph` on React Flow, with parity first (same nodes, edges, evidence panel), then filters, main path, list view and `focus`.
4. The chat docked and restyled, with context, the session check and cites.
5. The `show` tool, `chat-visuals.ts` and `chat-visual.tsx`.
6. An a11y pass (axe, keyboard run), the 375px pass, then lint, typecheck, build and `check-discovery`.
