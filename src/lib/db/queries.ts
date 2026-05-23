import { and, asc, desc, eq, gt, gte, isNull, lt, ne } from 'drizzle-orm'
import { db, sqliteHandle } from './index'
import {
  type AvailabilityWindow,
  availabilityWindows,
  type Booking,
  bookings,
  type EventType,
  eventTypes,
  type NewAvailabilityWindow,
  type NewEventType,
} from './schema'

// --- event types ------------------------------------------------------------

export function listEventTypes(): EventType[] {
  return db.select().from(eventTypes).orderBy(asc(eventTypes.title)).all()
}

export function getEventType(id: string): EventType | undefined {
  return db.select().from(eventTypes).where(eq(eventTypes.id, id)).get()
}

export function getEventTypeBySlug(slug: string): EventType | undefined {
  return db.select().from(eventTypes).where(eq(eventTypes.slug, slug)).get()
}

export function createEventType(values: Omit<NewEventType, 'createdAt' | 'updatedAt'>): EventType {
  return db.insert(eventTypes).values(values).returning().get()
}

export function updateEventType(
  id: string,
  values: Partial<Omit<NewEventType, 'id' | 'createdAt'>>,
): EventType | undefined {
  return db
    .update(eventTypes)
    .set({ ...values, updatedAt: Date.now() })
    .where(eq(eventTypes.id, id))
    .returning()
    .get()
}

export function deleteEventType(id: string): void {
  db.delete(eventTypes).where(eq(eventTypes.id, id)).run()
}

/** Returns true if some OTHER event type already owns the slug. */
export function slugTaken(slug: string, exceptId?: string): boolean {
  const row = db
    .select({ id: eventTypes.id })
    .from(eventTypes)
    .where(
      exceptId
        ? and(eq(eventTypes.slug, slug), ne(eventTypes.id, exceptId))
        : eq(eventTypes.slug, slug),
    )
    .get()
  return !!row
}

// --- availability -----------------------------------------------------------

export function listAvailabilityWindows(): AvailabilityWindow[] {
  return db
    .select()
    .from(availabilityWindows)
    .orderBy(asc(availabilityWindows.dayOfWeek), asc(availabilityWindows.startMinute))
    .all()
}

/** Replace the entire weekly schedule in one transaction. */
export function replaceAvailability(rows: Array<Omit<NewAvailabilityWindow, 'id'>>): void {
  const tx = sqliteHandle.transaction(() => {
    db.delete(availabilityWindows).run()
    for (const row of rows) {
      db.insert(availabilityWindows).values(row).run()
    }
  })
  tx()
}

// --- bookings ---------------------------------------------------------------

export function listBookingsForEvent(eventTypeId: string): Booking[] {
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.eventTypeId, eventTypeId))
    .orderBy(desc(bookings.startAtMs))
    .all()
}

export function listUpcomingBookings(nowMs = Date.now()): Booking[] {
  return db
    .select()
    .from(bookings)
    .where(and(isNull(bookings.cancelledAtMs), gte(bookings.startAtMs, nowMs)))
    .orderBy(asc(bookings.startAtMs))
    .all()
}

export function listRecentBookings(limit = 10): Booking[] {
  return db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(limit).all()
}

export function getBooking(id: string): Booking | undefined {
  return db.select().from(bookings).where(eq(bookings.id, id)).get()
}

export function getBookingByCancelToken(token: string): Booking | undefined {
  return db.select().from(bookings).where(eq(bookings.cancelToken, token)).get()
}

/** Returns active (non-cancelled) bookings for an event type whose
 *  `[startAtMs, endAtMs)` interval overlaps `[fromMs, toMs)`. Using
 *  overlap (not just `startAtMs` containment) catches bookings that
 *  begin before `fromMs` but end inside the window — e.g. a long meeting
 *  that crosses midnight and would otherwise be missed by the next day's
 *  availability computation. */
export function listActiveBookingsInRange(
  eventTypeId: string,
  fromMs: number,
  toMs: number,
): Booking[] {
  return db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.eventTypeId, eventTypeId),
        isNull(bookings.cancelledAtMs),
        lt(bookings.startAtMs, toMs),
        gt(bookings.endAtMs, fromMs),
      ),
    )
    .all()
}

export interface CreateBookingInput {
  eventTypeId: string
  startAtMs: number
  endAtMs: number
  guestName: string
  guestEmail: string
  guestNote: string
}

export type CreateBookingResult =
  | { kind: 'ok'; booking: Booking }
  | { kind: 'conflict' }
  | { kind: 'not-found' }

/**
 * Inserts a booking ONLY if no other active booking overlaps the same
 * `[startAtMs, endAtMs)` for the same event type. The lookup + insert run in
 * a single better-sqlite3 transaction, so two guests racing for the last
 * slot cannot both win.
 */
export function createBookingGuarded(input: CreateBookingInput): CreateBookingResult {
  const tx = sqliteHandle.transaction((): CreateBookingResult => {
    const event = db.select().from(eventTypes).where(eq(eventTypes.id, input.eventTypeId)).get()
    if (!event) return { kind: 'not-found' }
    // Overlap test: (existing.start < new.end) AND (existing.end > new.start).
    const overlapping = db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.eventTypeId, input.eventTypeId),
          isNull(bookings.cancelledAtMs),
          lt(bookings.startAtMs, input.endAtMs),
          // existing.end > input.start  ⇔  ¬(existing.end <= input.start)
        ),
      )
      .all()
      .filter((b) => b.endAtMs > input.startAtMs)
    if (overlapping.length > 0) return { kind: 'conflict' }
    const booking = db.insert(bookings).values(input).returning().get()
    return { kind: 'ok', booking }
  })
  return tx()
}

export function cancelBooking(id: string): Booking | undefined {
  return db
    .update(bookings)
    .set({ cancelledAtMs: Date.now() })
    .where(and(eq(bookings.id, id), isNull(bookings.cancelledAtMs)))
    .returning()
    .get()
}
