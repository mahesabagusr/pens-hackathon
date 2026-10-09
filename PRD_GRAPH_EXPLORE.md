# PRD: Graph Exploration in Jalur bukti ("Tampilkan tetangga")

| | |
|---|---|
| Version | 0.1 draft |
| Date | 9 October 2026 |
| Builds on | [PRD_DASHBOARD.md](PRD_DASHBOARD.md) (React Flow Jalur bukti, chat panel) and [PRD_DECISION_MAKER_DISCOVERY.md](PRD_DECISION_MAKER_DISCOVERY.md) (evidence model, AT-01 to AT-08) |
| Status | Ready for build. Open questions are listed in §14 |

## 1. Overview

**Feature name:** Graph Exploration ("Tampilkan tetangga", show neighbors)

**Problem statement:**
Jalur bukti only shows what `src/server/discovery.ts` decided was evidence for the decision maker. That graph is curated, cited and correct, but it has a fixed edge.

A rep looking at Rina Hapsari (K017) can't see the following without leaving the graph to ask the chat:
- the 12 contacts she worked alongside (`SALING_KENAL`)
- her old employer outside the dataset
- the tickets and outlets hanging off her previous account

Neo4j already holds those connections (1,946 nodes, 14 labels), but only the chat reads it.

**Proposed solution:**
Selecting a node in Jalur bukti offers "Tampilkan tetangga". This loads the node's Neo4j neighbors, grouped by relationship type. The user adds the groups they want to the canvas.

Added nodes and edges are visibly marked as **explored**. They sit beside the cited discovery graph and never change it. The discovery answer and its evidence stay exactly as they are.

**AI build summary:**

> In the existing Next.js 16 app (React Flow `@xyflow/react` 12 in `src/components/evidence-graph.tsx`, Neo4j via `src/server/graph.ts`, dark theme only), do the following:
>
> 1. Add `src/server/neighbors.ts` with `neighbors({ id, label, asOf })`. It runs one parameterized, read-only Cypher query and returns the node's neighbors grouped by relationship type, neighbor label and direction.
>    - Up to 12 items and the true total per group.
>    - Neighbors dated after `asOf` are dropped and counted in `hidden`.
> 2. Expose it as `GET /api/graph/neighbors?id=&label=&asof=` (session required, zod-validated, `label` from a fixed allowlist).
> 3. In the evidence panel of a selected node, add a "Tetangga di graf" section.
>    - A button fetches the groups and lists them with counts.
>    - "Tambah" on a group places its nodes on the canvas around the selected node.
>    - Explored nodes get a dashed border and a "graf" tag. Explored edges are dotted, with origin `"graph"`.
> 4. Do not change `discovery.ts` output, the main path, or AT-01 to AT-08.
> 5. No new dependencies, no new database tables, no new env vars.

## 2. Goals & Success Metrics

**Primary goal:** From any node in Jalur bukti, a user sees what else that node connects to in under 2 seconds, without leaving the page and without mistaking explored context for cited evidence.

**Success metrics:**
- Selecting a node, pressing "Tampilkan tetangga" and pressing "Tambah" on a group puts its nodes on the canvas in **≤ 3 actions**. The fetch takes **≤ 500 ms p95** on the local dataset.
- **0** explored nodes or edges are drawn in the discovery style. A tester can tell every explored item apart in grayscale (dash pattern plus text tag, not color).
- `scripts/check-discovery.mts` still passes. The new `scripts/check-graph-neighbors.mts` passes.

**Anti-goals:**
- Not replacing `discovery.ts` with Neo4j. The decision-maker answer, the claim edges and "Jalur utama saja" stay rule-based and cited from `data/`.
- Not a free-form Cypher console. The user picks a node and a group, nothing else.
- Not a graph editor. Users can't create, connect or delete records.
- Not persisting explorations across reloads in v1 (see §15).

## 3. Scope & Constraints

**In scope:**
- One-hop neighbor lookup for any node on the Jalur bukti canvas, including nodes that were themselves added by exploring (chained exploration).
- Grouping by relationship type, neighbor label and direction, with totals.
- Filtering by "Tanggal acuan" (as-of date).
- Adding groups, removing one expansion, and clearing all explored items.
- Explored items in the list view (table fallback) and in the existing origin and kind filters.
- A citation chip for explored **nodes** whose record exists in `data/`. This means extending `citesIn` with tickets, outlets, contracts and bugs.
- Selecting an explored node updates the chat context, as for discovery nodes.

**Out of scope:**
- Multi-hop or shortest-path search (Phase 2).
- Paging past 12 items per group. The panel offers "Tanya chat" for the rest.
- Exploration inside chat mini graphs (`compact` mode stays read-only).
- Storing explorations in the URL or database.
- File and row citations for explored **edges**.

**Technical constraints:**
- **Platform:** web, desktop first, but it must work in the 375px layout (the panel stacks under the canvas).
- **Auth:** existing session cookie (`currentUser()`). The endpoint returns 401 without one.
- **Accessibility:** WCAG 2.2 AA. Every action is reachable by keyboard and explored state isn't shown by color alone.
- **Offline:** none.
- **Performance:**
  - At most 12 nodes per group and 150 explored nodes on the canvas.
  - One Neo4j round trip per expansion.
  - Hub nodes are handled by grouping: the busiest account has 108 relationships.
- **Security:**
  - Cypher is parameterized.
  - The label is interpolated only from an allowlist.
  - Session mode is `READ`.
  - `id` is ≤ 80 characters. IDs can contain spaces, for example `Organisasi` names such as "KAP Wijaya & Rekan".

## 4. Jobs to Be Done (JTBD)

| Priority | Job Statement |
|---|---|
| J1 | When I've found the likely decision maker, I want to see who else they know and where they worked, so I can find a warm introduction. |
| J2 | When an account node looks thin, I want to see its tickets, outlets, contracts and deals, so I can judge account health before a call. |
| J3 | When I'm presenting the graph, I want explored context to look different from cited evidence, so nobody takes a guess for a proven claim. |
| J4 | When a node has too many neighbors, I want to pick which kind to show, so the canvas stays readable. |

## 5. User Stories

| ID | Role | Action | Benefit | JTBD |
|---|---|---|---|---|
| US1 | Sales rep | I want to load a selected node's neighbors as groups with counts | so that I can see what's there before cluttering the canvas | J1, J4 |
| US2 | Sales rep | I want to add one group to the canvas | so that I can explore only what matters | J1, J2, J4 |
| US3 | Judge / viewer | I want explored nodes and edges to look and read differently from evidence | so that I can trust the cited path | J3 |
| US4 | Sales rep | I want neighbors after the as-of date hidden | so that exploration respects the same point in time as discovery | J1, J2 |
| US5 | Sales rep | I want to remove an expansion or clear all exploring | so that I can get back to the clean evidence graph | J4 |
| US6 | Keyboard / screen-reader user | I want to expand, add and remove by keyboard, and to hear what was added | so that exploring isn't mouse-only | J1 |
| US7 | Sales rep | I want an explored node's source record and a "Tanya chat" action | so that I can verify it or dig deeper | J2, J3 |

## 6. Proposed Experience

**Design direction:**
The mental model is "pull a thread". The discovery graph is the solid, proven core. Exploring pulls lighter, dotted threads out of it, which you can cut again at any time.

Exploring never moves or restyles the core. It only adds around it. The panel stays the single place for actions, so the canvas never grows popovers. Copy is Indonesian, like the rest of the dashboard.

**Key screens and states**, all inside the existing Jalur bukti tab:

- **Evidence panel, node selected:** below "Bukti: …", a new section **"Tetangga di graf"**.
  - It holds a secondary button **"Tampilkan tetangga"** (icon `graph`) and the helper line "Hubungan dari Neo4j. Bukan bukti bertanda sumber."
  - When the node isn't expandable, for example a label outside the allowlist, the section isn't rendered.
- **Loading:**
  - The button turns disabled with a spinner and reads "Memuat tetangga…".
  - Three skeleton rows the size of group rows sit below it (no layout jump).
  - After 300 ms the selected node shows a subtle pulsing ring.
- **Groups list**, one row per group, sorted by total in descending order:
  - **Label chip** for the neighbor kind, for example "Kontak".
  - **Relationship type** with direction, for example "SALING_KENAL" or "← TERLIBAT_DI".
  - **Count**, for example "12", or "12 dari 38" when capped.
  - **Action:** a "Tambah" button, which becomes "Hapus" once the group is added.
  - **Groups already fully on the canvas:** they show "Sudah tampil" and their button is disabled.
  - **Capped groups:** they get a link "Tanya chat tentang 26 lainnya". It calls `chat.ask` with a prefilled question, for example "Tampilkan semua Tiket untuk akun C01 sebelum 2026-10-01".
  - **Footer:** "Tambah semua (n)", shown only when n ≤ 40, and when some neighbors were filtered out, "5 tetangga setelah {tanggal acuan} disembunyikan".
- **Canvas after adding:**
  - New nodes fade in (150 ms, opacity only) on an arc to the right of the source node.
  - The view eases to fit the source and new nodes (`fitView` with those node IDs, 300 ms). With reduced motion, there is no fade or ease.
- **Explored node style:**
  - Dashed 1px `border-line` border and `bg-background` (not `bg-panel`).
  - A small mono tag "graf" plus the Neo4j label (for example "Tiket").
  - Text stays at full contrast, since it's de-emphasized by style, not by opacity.
- **Explored edge style:**
  - Dotted stroke in `text-muted` color, with a label on hover, select or lit.
  - The legend gains the entry "Dari graf (tanpa sitasi)".
- **Explored node selected:** the panel shows:
  - the title, the Neo4j label, and "Ditambahkan dari {source node}"
  - **Properti:** the node's key fields
  - **Sumber:** the cite chip (file:row) when the ID resolves via `citesIn`, otherwise "Tidak ada baris sumber di data/"
  - its own "Tetangga di graf" section, which allows chained exploring
  - "Tanya chat tentang ini"
- **Explored edge selected:** the panel shows the relationship type, its properties (for example `jabatan`, `mulai`, `selesai`, `peran`, `via`, `tempat`) and a fixed note: "Hubungan ini diturunkan oleh loader graf, bukan kutipan dari satu baris data."
- **Toolbar:** a new "Hapus eksplorasi (n)" button, visible only when n > 0. "Atur ulang" keeps resetting discovery node positions only.
- **Empty:** "Tidak ada tetangga lain sebelum {tanggal}." When everything is already shown: "Semua tetangga sudah tampil."
- **Errors:**
  - **Neo4j unreachable (503):** an inline `role="alert"` reads "Graf Neo4j tidak bisa dihubungi. Jalur bukti tetap bisa dipakai." with a "Coba lagi" button.
  - **401:** "Sesi berakhir." with a "Masuk lagi" link to `/login`.
  - **Canvas limit (150 explored nodes):** the "Tambah" buttons are disabled with "Batas 150 node eksplorasi. Hapus sebagian dulu."

**Interaction model:**
- Primary flow:
  1. Open the Jalur bukti tab.
  2. Click or Tab to a node. The panel shows its evidence.
  3. Press "Tampilkan tetangga" (or `e` while the node is focused or selected). The groups load.
  4. Press "Tambah" on a group. The nodes appear and the view fits.
  5. Select an explored node. Its properties and cite chip show, and it can be expanded further.
  6. Remove that group with "Hapus" on the same row, or remove everything with "Hapus eksplorasi" in the toolbar.
- Shortcuts:
  - `e` expands the selected node.
  - `Shift+E` removes the explored items added from the selected node.
  - The existing `f`, `+` and `-` are unchanged.
- **Removal rule:** removing a group deletes its edges. A node is deleted only when no remaining edge (discovery or explored) connects to it.
- **Merging:** if a neighbor is already on the canvas, it isn't duplicated; only the edge is added.
  - An edge is skipped when the canvas already has an edge between the same pair with an equivalent type.
  - `MEMILIKI_DEAL` ≡ `MEMILIKI` and `MELIBATKAN` ≡ `TERLIBAT_DI`. Other types must match exactly.
  - So `CHAMPION_DARI` between K017 and C01 is still added next to the discovery `PERNAH_BEKERJA_DI`.
- Undo is the "Hapus" button. There is no other undo stack.
- Changing "Tanggal acuan" or the account remounts the graph (existing `key`), which clears explorations. This is intended: explored items must match the date.

**Accessibility notes:**
- Group rows form a list (`ul`). Each button has an accessible name that includes the group, for example "Tambah 12 Kontak, SALING_KENAL".
- After adding or removing, an `aria-live="polite"` region (the existing count region) announces "12 node ditambahkan dari graf: 12 Kontak." or "Eksplorasi dari Rina Hapsari dihapus."
- Explored nodes' `ariaLabel` ends with ", dari graf, tanpa sitasi". The list view adds a column "Asal" whose value "Graf" is text, not just style.
- Focus stays on the button that was pressed. "Tambah" becomes "Hapus" in place, so focus isn't lost.
- Contrast: tags and text meet 4.5:1 on `bg-background`. The dotted edge reaches 3:1 against the canvas as a non-text graphic.

**Figma / design link:** none. Follow the tokens in `src/app/globals.css` and the existing evidence-graph styles.

## 7. Component Inventory

| Component | Type | Description | Stories |
|---|---|---|---|
| `GraphNeighbors` (`src/components/graph-neighbors.tsx`) | Display + Action | The "Tetangga di graf" panel section, covering the button, loading skeleton, group list, footer, errors and empty states. It takes `node`, `asOf`, `added` and the callbacks `onAdd(group)` and `onRemove(groupKey)`. | US1, US2, US5, US6 |
| Group row | Display + Action | Label chip, relationship type with direction, count ("12 dari 38"), and a Tambah/Hapus toggle button, plus a "Tanya chat tentang n lainnya" link when capped | US1, US2, US4 |
| Explored node style (in `EvidenceNode`) | Display | `data.explored` adds a dashed border, the "graf" tag and the Neo4j label text | US3 |
| Explored edge style (in `EvidenceEdge`) | Display | `origin === "graph"` gives a dotted muted stroke | US3 |
| Legend entry and origin chip "Graf" | Display / Filter | Adds `"graph"` to the existing origin legend and origin filter chips | US3, US5 |
| "Hapus eksplorasi (n)" | Action | Toolbar button that clears all explored items | US5 |
| Explored node panel body | Display | Properties, cite chip or the "no source row" note, "Ditambahkan dari …" | US7 |
| Explored edge panel body | Display | Relationship properties plus the fixed "diturunkan oleh loader" note | US3 |
| List view "Asal" column | Display | The value "Bukti" or "Graf" per edge row | US3, US6 |

## 8. Data Models

All transient. Nothing new is stored.

```typescript
// src/server/discovery.ts (extend existing types)
export type Origin = "record" | "join" | "text_claim" | "cross_source_match" | "graph"; // "graph" = explored, no citation
export type GraphNode = {
  id: string;
  label: string;
  kind: NodeKind;
  focus?: boolean;
  type?: string;                     // Neo4j label, e.g. "Tiket"; set on explored nodes
  explored?: boolean;                // true = added by "Tampilkan tetangga"
  props?: Record<string, string>;    // explored nodes: up to 8 display fields, values ≤ 200 chars
};
export type GraphEdge = {
  from: string;
  to: string;
  type: string;
  origin: Origin;
  evidence: string[];                // always [] when origin === "graph"
  props?: Record<string, string>;    // relationship properties (mulai, selesai, jabatan, peran, via, tempat, …)
  count?: number;                    // >1 when parallel rels were collapsed (MEMAKAI per month)
};

// src/server/neighbors.ts
export const LABELS = ["Akun", "Kontak", "Karyawan", "Outlet", "Deal", "Kontrak", "Interaksi", "Tiket",
  "Bug", "Rilis", "Fitur", "Keputusan", "Kompetitor", "Organisasi"] as const;
export type Label = (typeof LABELS)[number];

export type NeighborGroup = {
  key: string;                       // `${type}|${label}|${direction}`, e.g. "SALING_KENAL|Kontak|out"
  type: string;                      // relationship type
  label: Label;                      // neighbor's Neo4j label
  direction: "out" | "in";           // relative to the expanded node
  total: number;                     // all matching neighbors at asOf
  nodes: GraphNode[];                // ≤ 12, newest first where a date exists, else by id
  edges: GraphEdge[];                // one per node, origin "graph"
};

export type NeighborResult = {
  id: string;
  label: Label;
  asOf: string;                      // YYYY-MM-DD
  groups: NeighborGroup[];           // sorted by total desc
  hidden: number;                    // neighbors excluded because dated after asOf
};
```

**Date rule for `asOf`.** A neighbor is kept when its date is ≤ `asOf`, or when it has no date:

| Where the date lives | Field |
|---|---|
| Relationship | `mulai` (`BEKERJA_DI`, `PERNAH_BEKERJA_DI`); `bulan` (`MEMAKAI`, compared as `YYYY-MM`) |
| Neighbor node | `Interaksi.tanggal`, `Keputusan.tanggal`, `Tiket.dibuat`, `Deal.dibuat`, `Kontrak.mulai`, `Bug.dibuat`, `Rilis.tanggal_rilis` |
| None (always shown) | `Akun`, `Kontak`, `Karyawan`, `Outlet`, `Fitur`, `Organisasi`, `Kompetitor`; `CHAMPION_DARI`, `SALING_KENAL` (see §14) |

All dates are stored as `YYYY-MM-DD` strings by `scripts/load-neo4j.mts`, so string comparison is correct.

**Node mapping:**
- `kind` comes from the existing label→kind map in `src/server/chat-visuals.ts`, which gets exported. Labels outside it become `"other"`.
- The display label is the first of `nama`, `subjek`, `judul`, `id`.
- The client sends `label` for discovery nodes from a `NodeKind → Label` map:

| `NodeKind` | Neo4j label |
|---|---|
| `account` | `Akun` |
| `person` | `Kontak` |
| `deal` | `Deal` |
| `employee` | `Karyawan` |
| `interaction` | `Interaksi` |
| `decision` | `Keputusan` |
| `feature` | `Fitur` |

Explored nodes send their `type`.

**Citations for explored nodes:** extend `citesIn` in `src/server/chat-visuals.ts` and `dataset()`:

| ID | File | Label column |
|---|---|---|
| `T0001` | `support_tickets.csv` | `judul` |
| `C01-O01` | `outlets.csv` | `outlet_id` |
| `K-C01` | `contracts_billing.csv` | `contract_id` |
| `BUG-398` | `bugs.csv` | `judul` |

- The new alternatives go **before** `[CP]\d{2}` and `K\d{3}` in the ID regex, so `C01-O01` and `K-C01` aren't split.
- `Rilis` (`4.10`), `Organisasi` and `Kompetitor` (names) stay uncited.
- This also makes those IDs citable and usable as chat context in chat answers, a side benefit.

## 9. API / Integration Surface

| Method | Path | Description | Auth | Response |
|---|---|---|---|---|
| GET | `/api/graph/neighbors?id=K017&label=Kontak&asof=2026-10-01` | One-hop neighbors of a node, grouped and date-filtered | Yes (session cookie) | `NeighborResult` |

**Validation (zod):**
- `id`: string, 1–80 characters.
- `label`: an enum of `LABELS`.
- `asof`: `/^\d{4}-\d{2}-\d{2}$/`, ≤ `SNAPSHOT`, defaulting to `SNAPSHOT`.

**Responses:**

| Status | When | Body |
|---|---|---|
| 401 | No session | `{ error: "unauthorized" }` |
| 400 | Invalid query | `{ error: "invalid", issues }` |
| 404 | No node with that `id` and `label` | `{ error: "not_found" }` |
| 503 | Neo4j unreachable | `{ error: "graph_unavailable" }` |
| 200 | Otherwise | The `NeighborResult`, with `Cache-Control: private, no-store` |

**Cypher:** one plain read. The label is interpolated from the allowlist only; `id` is a parameter.

```cypher
MATCH (n:`${label}` {id: $id})
OPTIONAL MATCH (n)-[r]-(m)
RETURN type(r) AS type, labels(m)[0] AS label, startNode(r) = n AS out, properties(r) AS rel, properties(m) AS node
```

How the rows are handled:
- **Zero rows:** 404.
- **One row with a null `type`:** the node exists but has no neighbors. Return empty groups.
- **Everything else happens in TypeScript** over the rows:
  - apply the §8 date rule, and count what it drops into `hidden`
  - group the rows
  - sort and cap each group at 12
  - collapse parallel `MEMAKAI` rels into one edge with `count`
- The largest node returns 108 rows, so this is cheap. Doing it in TypeScript also keeps the date rule unit-testable.
- Use `graph().session({ defaultAccessMode: neo4j.session.READ })`. The driver already has `disableLosslessIntegers`.

**External integrations:** none new. Neo4j 5 Community, which already runs in Docker, and the existing Gemini chat via `chat.ask` for "Tanya chat tentang n lainnya".

## 10. State Management Map

| State | Location | Persistence | Notes |
|---|---|---|---|
| Discovery nodes and edges | Server props → `rf` state in `Graph` | None | Unchanged |
| `explored: Map<groupKey, { source: string; nodeIds: string[]; edgeIds: string[] }>` | Local UI (`Graph`) | None | Drives removal and the "Hapus" state per row. The key includes the source node ID. |
| Explored nodes and edges | Merged into `rf` and the edge list | None | Flagged `explored` / `origin: "graph"`, so the filters and list view work unchanged |
| `neighbors: Map<nodeId, NeighborResult \| "loading" \| Error>` | Local UI (`Graph`) | None | Caches the fetched groups so reselecting a node doesn't refetch |
| Origin filter including `"graph"` | Local UI (`hiddenOrigins`) | None | Hiding "Graf" hides all explored items without removing them |
| Selected node | Local UI → `chat.setSelectedNode` | Session (chat) | Unchanged. Explored node IDs now resolve through the extended `citesIn`. |

Nothing goes in the URL in v1. The graph is remounted by `key` on account, date or focus change, which clears exploration (see §14).

## 11. Tech Stack

The existing stack, with no additions.

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 16 App Router, React 19 | Existing |
| Graph UI | `@xyflow/react` 12 | Already renders Jalur bukti. Adding nodes is just state. |
| Styling | Tailwind 4 tokens in `globals.css` | Existing dark theme |
| Graph store | Neo4j 5 Community, `neo4j-driver` | Already holds every relationship. One read query per expansion. |
| Validation | zod | Already used in `/api/chat` |
| Auth | `currentUser()` from `src/server/auth.ts` | Existing session |

## 12. File Structure

```
src/
├── app/api/graph/neighbors/route.ts   # new: GET, auth, zod, calls neighbors()
├── server/
│   ├── neighbors.ts                   # new: LABELS, neighbors({ id, label, asOf }) → NeighborResult
│   ├── discovery.ts                   # Origin += "graph"; GraphNode/GraphEdge optional fields
│   ├── chat-visuals.ts                # export label→kind map; citesIn += tickets, outlets, contracts, bugs
│   └── dataset.ts                     # load support_tickets, outlets, contracts_billing, bugs
├── components/
│   ├── graph-neighbors.tsx            # new: "Tetangga di graf" panel section
│   └── evidence-graph.tsx             # explored styles, merge/remove, `e` / Shift+E, toolbar button, legend
scripts/
└── check-graph-neighbors.mts          # new: assertions against the loaded graph (no browser, no Gemini)
```

## 13. Acceptance Criteria

Fixed facts from the loaded dataset are used below. `asOf` defaults to `2026-10-01`.

**US1: load groups**
- [ ] With K017 (Rina Hapsari) selected, "Tampilkan tetangga" shows groups including `SALING_KENAL · Kontak · 12`, `TERLIBAT_DI · Interaksi · 7`, `PERNAH_BEKERJA_DI · Organisasi · 1`, `PERNAH_BEKERJA_DI · Akun · 1`, `BEKERJA_DI · Akun · 1` and `CHAMPION_DARI · Akun · 1`.
- [ ] Groups are sorted by total, descending. A group with more than 12 neighbors shows "12 dari {total}" and a "Tanya chat tentang {total-12} lainnya" link.
- [ ] The request is `GET /api/graph/neighbors?id=K017&label=Kontak&asof=2026-10-01` and returns 200 in ≤ 500 ms locally.
- [ ] Reselecting K017 shows the cached groups without a second request.
- [ ] Error state: with the Neo4j container stopped, the panel shows the "Graf Neo4j tidak bisa dihubungi" alert with "Coba lagi". The discovery graph still works.

**US2: add a group**
- [ ] "Tambah" on `SALING_KENAL · Kontak` adds 12 nodes and 12 dotted edges from K017, and the view fits the source plus the new nodes.
- [ ] A neighbor already on the canvas isn't duplicated (node count rises only by new IDs).
- [ ] `CHAMPION_DARI` K017→C01 is added, even though the discovery `PERNAH_BEKERJA_DI` K017→C01 exists.
- [ ] Equivalent types aren't duplicated: expanding P01 doesn't add a second edge for `MEMILIKI` P01→DL-xxx when the discovery `MEMILIKI_DEAL` exists.
- [ ] Expanding an explored node works (chained). Adding past 150 explored nodes is blocked with the limit message.

**US3: explored is distinguishable**
- [ ] Every explored node has the dashed border, the "graf" tag and its Neo4j label as visible text.
- [ ] Every explored edge is dotted and `origin === "graph"`.
- [ ] The legend and origin chips include "Graf". Toggling the chip hides all explored items and toggling it back restores them.
- [ ] "Jalur utama saja" hides all explored items.
- [ ] The explored edge panel shows the "diturunkan oleh loader graf" note and no evidence cards.
- [ ] `discovery.ts` output is byte-identical before and after this change, and `npx tsx scripts/check-discovery.mts` passes.

**US4: as-of date**
- [ ] With `asof=2026-08-01`, K017 has no `BEKERJA_DI · Akun` group (it starts 2026-09-01).
- [ ] With `asof=2026-08-01`, `TERLIBAT_DI · Interaksi` totals 6 (I0290 on 2026-08-14 is excluded).
- [ ] With `asof=2026-08-01`, `hidden` is ≥ 2 and the footer says so.
- [ ] Changing "Tanggal acuan" clears all explored items.

**US5: remove**
- [ ] "Hapus" on an added group removes its edges, plus any of its nodes that no remaining edge connects to.
- [ ] A node also reached by a discovery edge or by another expansion stays.
- [ ] "Hapus eksplorasi (n)" removes every explored item and hides itself.
- [ ] "Atur ulang" still only resets discovery positions.

**US6: keyboard and screen reader**
- [ ] With a node focused, `e` loads groups, Tab reaches each "Tambah", and Enter adds the group. `Shift+E` removes that node's expansions.
- [ ] After adding, the live region announces "{n} node ditambahkan dari graf: {breakdown}."
- [ ] Explored node `ariaLabel` ends with ", dari graf, tanpa sitasi".
- [ ] The list view shows an "Asal" column with the text "Graf" for explored edges.
- [ ] With `prefers-reduced-motion: reduce`, nodes appear without fade and the view jumps instead of easing.

**US7: verify and ask**
- [ ] Selecting explored ticket `T0001` shows the cite chip `support_tickets.csv:2`. Selecting `C01-O01` shows `outlets.csv:2`, `K-C01` shows `contracts_billing.csv:2` and `BUG-398` shows `bugs.csv:2`.
- [ ] Selecting an `Organisasi` node shows "Tidak ada baris sumber di data/".
- [ ] `citesIn("C01-O01 K-C01")` returns exactly those two IDs, not `C01`.
- [ ] "Tanya chat tentang ini" on an explored node opens the chat with that node as the context chip.

**API**
- [ ] No session → 401. `label=Foo` → 400. `id=NOPE&label=Kontak` → 404. `asof=2027-01-01` → 400.
- [ ] `id` with Cypher syntax (for example `x'}) DETACH DELETE n //`) → 404, and the node count is unchanged (parameterized).

**Checks**
- [ ] `scripts/check-graph-neighbors.mts` asserts the US1 counts, the US4 date cases, the 12-cap with the true total on C01, the 404 case, and the new `citesIn` IDs.
- [ ] `npm run lint`, `npx tsc --noEmit` and `npm run build` pass.

## 14. Open Questions & Risks

- **Q:** Should `SALING_KENAL` respect the as-of date? It's derived from job overlaps across all time, so with an early as-of date it can reveal a later overlap. The v1 default shows it with the note "tanpa tanggal". The proper fix is to compute it at query time from the two jobs' `mulai`. _Owner: Eng_
- **Q:** `CHAMPION_DARI` is the CRM's current value, not dated. Should it be hidden for as-of dates before the snapshot? The v1 default shows it. _Owner: PM_
- **Q:** Should explorations survive switching tabs or a reload (URL `?explore=K017:SALING_KENAL|Kontak|out,…`)? v1 says no, because the graph is remounted by `key`. _Owner: Design_
- **Risk:** Users may read dotted explored edges as evidence when screenshots are shared. _Mitigation: the "graf" text tag on every explored node, the legend entry, and the explored-edge panel note. Text isn't lost in grayscale or screenshots._
- **Risk:** Neo4j drifts from `data/` if `graph:load` isn't re-run after data changes. _Mitigation: the cite chip on explored nodes reads `data/` directly, so a mismatch shows up. AGENTS.md already says to reload both._
- **Risk:** Hub nodes, such as an account with 108 relationships, clutter the canvas. _Mitigation: the group-first flow, the 12 cap, "Tambah semua" only when ≤ 40, and the 150 node limit._
- **Tradeoff:** Explored edges carry no file:row citation, even when a foreign-key column could provide one. This keeps `neighbors.ts` independent of `data/` file layout. Phase 2 can map join rels (for example `Tiket-[:MEMBUKA_TIKET]-Outlet` → `support_tickets.csv` row, column `outlet_id`) to evidence.

## 15. Rollout & Next Steps

**MVP scope:**
- Includes: everything in US1 to US7, the endpoint, the check script and the citation extension.
- Excludes: multi-hop search, URL persistence, paging past 12, and edge citations.

**Phase 2+ ideas:**
- Edge citations for foreign-key relationships (see the tradeoff in §14).
- "Cari jalur" (find path): the shortest path from a KasirNusa employee to the decision maker through `SALING_KENAL` and `PERNAH_BEKERJA_DI`.
- A "Tambahkan ke Jalur bukti" action on chat mini-graph nodes.
- Persisting explorations in the URL.

**Sign-off needed from:**
- [ ] PM (the default answers to the §14 questions)
- [ ] Engineering lead
- [ ] Design (explored styles)

**Build order:**
1. `dataset.ts` and `citesIn` extension, plus their asserts. _Small, independently useful for the chat._
2. `src/server/neighbors.ts` and `scripts/check-graph-neighbors.mts`.
3. `GET /api/graph/neighbors`, with the auth and validation cases.
4. Type extensions in `discovery.ts` (optional fields only), then the explored node and edge styles, legend and origin chip.
5. `graph-neighbors.tsx` panel section, merge and remove logic, toolbar button, `e` / `Shift+E`.
6. List view "Asal" column, live-region copy, reduced motion.
7. Lint, typecheck, build, both check scripts, and a browser pass at 1440px and 375px.
