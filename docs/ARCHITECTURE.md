# Toki — Architecture

## Surface

- **Host UI** (single trusted user, server's local browser):
  - `/` dashboard with event types and recent bookings.
  - `/event-types/new`, `/event-types/[id]` — CRUD.
  - `/availability` — weekly schedule editor.
  - `/bookings` — full bookings list.
- **Public guest UI**:
  - `/book/{slug}` — pick a date + slot.
  - `/book/{slug}/confirm` — guest details form.
  - `/book/{slug}/confirmed/{id}` — confirmation page with cancel link.
  - `/cancel/{token}` — cancellation.

## Data model

- `event_types(id, slug, title, description, durationMinutes,
  locationKind, locationDetail, color, createdAt, updatedAt)`
- `availability_windows(id, dayOfWeek 0-6, startMinute 0-1440,
  endMinute 0-1440 > startMinute)` — global weekly schedule shared by all
  event types.
- `bookings(id, eventTypeId, startAtMs, endAtMs, guestName, guestEmail,
  guestNote, cancelToken, cancelledAtMs nullable, createdAtMs)`

## Pure logic

`src/lib/scheduling/slots.ts` exports `computeSlots()`:

```ts
computeSlots({
  date: 'YYYY-MM-DD',
  durationMinutes: number,
  windows: AvailabilityWindow[],
  bookings: Array<{ startAtMs, endAtMs }>,
  nowMs: number,
  tzOffsetMinutes: number,
}): number[]   // start-of-slot UTC ms
```

Properties:
- Slots step by `durationMinutes` within each matching window.
- A slot is omitted if it overlaps any existing booking.
- Past slots (start ≤ now) are omitted.
- Windows that don't fit a full duration produce no slots.

## Booking write path

`createBookingAction` runs a single better-sqlite3 transaction that:

1. Re-reads `availability_windows` and existing `bookings`.
2. Re-computes slots for the requested date.
3. Verifies the requested `startAt` is still in the open set.
4. Inserts the booking row.

This makes the "two guests racing for the last slot" case safe — the second
transaction sees the first's insert and rejects.

## What we deliberately do not have

- Authentication, multi-user, tenants.
- Email or SMS notifications. The booking confirmation page just shows the
  cancel link; you copy/paste it.
- Google Calendar / iCal sync.
- Recurring events.
