<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Decidely (Decision Dictionary)

Next.js 16 App Router app on a synthetic KasirNusa dataset: a static landing page, email/password auth, Postgres (Prisma) for records and Neo4j for the decision graph.

## Commands

| Task | Command |
|---|---|
| Start databases | `npm run db:up` |
| Dev server | `npm run dev` (restart it after `prisma generate`: dev caches the Prisma client) |
| Lint (includes the folder rules below) | `npm run lint` |
| Typecheck | `npx tsc --noEmit` |
| Production build | `npm run build` |
| New migration | `npx prisma migrate dev --name <change>` |
| Load the dataset | `npm run db:load`, then `npm run graph:load` |
| Discovery acceptance tests (PRD §13) | `npx tsx scripts/check-discovery.mts` |

Run lint, typecheck and build before calling a change done.

## Folder structure

```
src/
  app/                 Routes only. page.tsx, layout.tsx, route.ts, plus globals.css, fonts/ and favicon.
    api/<name>/route.ts  HTTP endpoints.
    <route>/page.tsx     One folder per URL segment (login/, register/).
  components/          React components used by routes. Client components start with "use client".
  server/              Server-only code: db.ts (Prisma), graph.ts (Neo4j), auth.ts (sessions), queries.
    actions/           Server Actions ("use server"), one file per domain (auth.ts).
  trpc/                tRPC client, init and routers/.
  generated/           Prisma client output. Never edit; run `npx prisma generate`.
prisma/                schema.prisma and migrations/.
scripts/               One-off loaders run with tsx.
data/                  The synthetic dataset (CSV, JSONL). Read-only input.
public/                Static files served at /. Logo: logo-wordmark.png (cropped from logo.png).
design/                Design reference (basedash DESIGN.md, screenshots). Not imported by the app.
```

Where new code goes:

- A new page: `src/app/<segment>/page.tsx`. Keep it thin: compose components, call server code.
- A component used by a page or layout: `src/components/<kebab-name>.tsx`. Do not put components in `src/app`.
- Database or graph reads, session logic: `src/server/<domain>.ts`.
- A form mutation: a Server Action in `src/server/actions/<domain>.ts`.
- A schema change: edit `prisma/schema.prisma`, run `prisma migrate dev`, never hand-edit `src/generated`.

Rules (the first two are enforced by `npm run lint`):

1. Imports that leave the current folder use the `~/` alias (`~/components/nav`), never `../`. Same-folder `./` is fine.
2. Nothing imports from `src/app`. Routes are leaves; shared code lives in `src/components` or `src/server`.
3. File names are kebab-case. One main export per component file, named in PascalCase.
4. Client components never import `src/server/*` modules other than `src/server/actions/*`.
5. Secrets come from `.env` (see `.env.example`). Add every new variable to `.env.example` and `docker-compose.yml`.

## Design

Dark theme only. Tokens live in `src/app/globals.css` (`@theme`): page `#08080a`, panel `#131316`, accent `#00c758`, `shadow-bubble` for the one focal card per screen. Display font is Basedash Glitch (`font-display`).
