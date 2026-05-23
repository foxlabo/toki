# Toki

> A local scheduling app — define your weekly availability, publish event
> types, let guests book slots via a public link. Inspired by Cal.com,
> re-implemented from scratch.

Toki is part of a clean-room portfolio series alongside Akari (AI chat),
Origami (chatbot flow builder), and Kioku (local AI notes).

## Features

- **Event types** — name, slug, duration, description, location kind
  (in-person / video / phone).
- **Weekly availability** — per day-of-week start/end windows, multiple
  per day, capped to a 24-hour range.
- **Public booking page** at `/book/{slug}` — pick a date, pick a slot, fill
  in name/email/note, confirm.
- **Bookings list** for the host with cancel links.
- **Guest cancellation** via unique `/cancel/{token}` page.
- **Conflict-safe writes** — a slot can only be claimed once.

## Stack

- Next.js 16 App Router + React 19.2 + Tailwind 4
- TypeScript strict, Biome (lint + format), Vitest (unit), Playwright (e2e)
- SQLite via better-sqlite3 + Drizzle ORM
- Zod for runtime validation

## Quick start

```sh
cp .env.example .env.local
pnpm install
pnpm db:generate
pnpm dev --port 3400
```

Open <http://localhost:3400>.

## Security note

Toki is intended for **local, single-user** use. There is no authentication;
anyone with access to the dev server can edit your availability and event
types. The booking and cancel endpoints are public by design (guests need
them to book). Do not deploy this to the public internet as-is.

The host UI assumes the **server's local timezone**. Bookings store
millisecond UTC timestamps; the display layer uses `toLocaleString`.

## License

MIT — see [LICENSE](LICENSE).
