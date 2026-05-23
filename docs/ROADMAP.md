# Toki — Roadmap

## v1.0 (current)

- Host dashboard with event types + recent bookings.
- Weekly availability editor.
- Public booking page with calendar + slot picker.
- Conflict-safe booking writes via better-sqlite3 transaction.
- Guest cancellation via unique token.

## v1.1 ideas

- Email notifications on booking / cancellation (SMTP config).
- iCal `.ics` download on confirmation.
- Per-event-type availability overrides.
- Buffer / gap settings (5 min between back-to-back meetings).
- Booking limits (max N per day).

## v2.0 ideas

- Multi-user (would need real auth — out of scope for the portfolio).
- Google Calendar sync (would need OAuth — out of scope).
- Recurring slots / one-off date exceptions.
