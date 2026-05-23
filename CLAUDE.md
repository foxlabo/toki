# CLAUDE.md — Toki

Context for AI coding agents working on this repo.

## Project intent

Toki is a portfolio-grade clean-room reimagining of `Cal.com`: a local
scheduling app. The host defines availability + event types; guests pick a
slot via a public booking page. Quality over speed.

## Hard rules

- **No code copy from Cal.com.** Reading its docs for understanding is fine.
- **TypeScript strict.** No `any` without a `// reason:` comment.
- **No `console.log`** in committed code.
- **Pure logic** (slot computation, validation) gets Vitest tests.
- Conventional Commits, small and atomic.

## Stack reminders

- Next.js **16** App Router (docs in `node_modules/next/dist/docs/`)
- React 19.2, Tailwind **4** (configured via CSS)
- Drizzle ORM + `better-sqlite3`
- Local SQLite at `./toki.db`. WAL + `foreign_keys = ON`.

## Architecture rules

- Slot enumeration in `src/lib/scheduling/slots.ts` is **pure** — takes the
  date, duration, availability windows, existing bookings, "now", and a
  timezone offset; returns the open start times. Unit-test it without the DB.
- DB access goes through `src/lib/db/`; routes/actions import from there.
- Server Components must not pass functions as props to Client Components.
- Booking writes go through a single guarded transaction so two guests can't
  claim the same slot.

## Security model

- Local-only, single-user host. No auth. README must spell this out.
- Public `/book/{slug}` and `/cancel/{token}` are by-design unauthenticated.
- Inputs (guest name/email/note, slug, availability windows) are size-capped
  and zod-validated server-side.

## Before claiming done

Run `pnpm typecheck && pnpm check && pnpm test`. For UI, verify in a real
browser — `next build` does not render dynamic routes so runtime bugs slip
past.
