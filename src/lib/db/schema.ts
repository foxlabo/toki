import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

const nowMs = (name: string) =>
  integer(name)
    .notNull()
    .$defaultFn(() => Date.now())

export const eventTypes = sqliteTable('event_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  /** URL-safe identifier exposed in `/book/{slug}`. Unique. */
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  durationMinutes: integer('duration_minutes').notNull(),
  /** One of: in-person, video, phone. Free-form so future kinds don't need a migration. */
  locationKind: text('location_kind').notNull().default('video'),
  /** Address / meeting URL / phone number. Shown to the guest on confirmation. */
  locationDetail: text('location_detail').notNull().default(''),
  /** Tailwind hue class fragment, e.g. 'emerald' / 'amber'. */
  color: text('color').notNull().default('zinc'),
  createdAt: nowMs('created_at'),
  updatedAt: nowMs('updated_at'),
})

export const availabilityWindows = sqliteTable('availability_windows', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: integer('day_of_week').notNull(),
  /** Minutes from midnight (server-local), 0..1440. */
  startMinute: integer('start_minute').notNull(),
  endMinute: integer('end_minute').notNull(),
})

export const bookings = sqliteTable('bookings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  eventTypeId: text('event_type_id')
    .notNull()
    .references(() => eventTypes.id, { onDelete: 'cascade' }),
  /** UTC ms. */
  startAtMs: integer('start_at_ms').notNull(),
  endAtMs: integer('end_at_ms').notNull(),
  guestName: text('guest_name').notNull(),
  guestEmail: text('guest_email').notNull(),
  guestNote: text('guest_note').notNull().default(''),
  /** Opaque token in the cancel URL; not a credential — see security note. */
  cancelToken: text('cancel_token')
    .notNull()
    .unique()
    .$defaultFn(() => nanoid(32)),
  cancelledAtMs: integer('cancelled_at_ms'),
  createdAt: nowMs('created_at'),
})

export type EventType = typeof eventTypes.$inferSelect
export type NewEventType = typeof eventTypes.$inferInsert
export type AvailabilityWindow = typeof availabilityWindows.$inferSelect
export type NewAvailabilityWindow = typeof availabilityWindows.$inferInsert
export type Booking = typeof bookings.$inferSelect
export type NewBooking = typeof bookings.$inferInsert
