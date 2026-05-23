# Toki — Development

## Setup

```sh
pnpm install            # auto-builds better-sqlite3 native binding
cp .env.example .env.local
pnpm db:generate        # rebuild migration if schema.ts changed
pnpm dev --port 3400
```

The dev server seeds two sample event types and a default Mon–Fri 9–17
weekly schedule on first run.

## Scripts

| script              | what it does                              |
|---------------------|-------------------------------------------|
| `pnpm dev`          | Next.js dev server (turbopack)            |
| `pnpm build`        | production build                          |
| `pnpm typecheck`    | `tsc --noEmit`                            |
| `pnpm check`        | Biome lint + format check                 |
| `pnpm check:fix`    | Biome auto-fix                            |
| `pnpm test`         | Vitest unit tests                         |
| `pnpm test:e2e`     | Playwright (boots dev server on 3400)     |
| `pnpm db:generate`  | drizzle-kit migration from `schema.ts`    |
| `pnpm db:push`      | apply migration directly (skips file)     |

## Gotchas inherited from the portfolio

- `pnpm.onlyBuiltDependencies` must be in `package.json` BEFORE the first
  `pnpm install`, or rerun install after editing it. Otherwise the
  better-sqlite3 native binary won't be built and dev fails at first DB hit.
- All pages that read the DB are `export const dynamic = 'force-dynamic'`.
- Server actions cannot run during page render — they must be triggered by
  a form submission or a client `useTransition` call.
- Time zones: bookings store epoch milliseconds; display layer uses
  `Intl.DateTimeFormat`. The host editor assumes the **server's** TZ.

## Layout

```
src/
  app/
    page.tsx                       host dashboard
    bookings/page.tsx              all bookings
    availability/page.tsx          weekly schedule editor
    event-types/new/page.tsx
    event-types/[id]/page.tsx
    book/[slug]/page.tsx           guest: calendar
    book/[slug]/confirm/page.tsx   guest: form
    book/[slug]/confirmed/[id]/page.tsx
    cancel/[token]/page.tsx
    actions.ts                     server actions
  components/
    ui/...
    host/...
    booking/...
  lib/
    db/{schema,index,init,queries}.ts
    scheduling/{slots,validate}.ts (pure)
tests/
  unit/scheduling/slots.test.ts
```
