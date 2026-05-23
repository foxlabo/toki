'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ensureDbReady } from '@/lib/db/init'
import {
  type CreateBookingResult,
  cancelBooking,
  createBookingGuarded,
  createEventType,
  deleteEventType,
  getBookingByCancelToken,
  getEventType,
  listActiveBookingsInRange,
  listAvailabilityWindows,
  replaceAvailability,
  slugTaken,
  updateEventType,
} from '@/lib/db/queries'
import { computeSlots, endOfDayMs, localDateTimeToUtcMs } from '@/lib/scheduling/slots'
import { hostTimezone } from '@/lib/scheduling/tz'
import { COLOR_TOKENS, EMAIL_REGEX, LOCATION_KINDS, SLUG_REGEX } from '@/lib/scheduling/validate'

const MAX_TITLE = 100
const MAX_DESCRIPTION = 1_000
const MAX_LOCATION_DETAIL = 200
const MAX_GUEST_NAME = 100
const MAX_GUEST_EMAIL = 200
const MAX_GUEST_NOTE = 2_000

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(48)
  .regex(SLUG_REGEX, { message: 'Slug must be lowercase letters, digits, or dashes.' })

const eventTypeSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(MAX_TITLE),
  description: z.string().trim().max(MAX_DESCRIPTION),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  locationKind: z.enum(LOCATION_KINDS),
  locationDetail: z.string().trim().max(MAX_LOCATION_DETAIL),
  color: z.enum(COLOR_TOKENS),
})

export interface ActionResult {
  ok: boolean
  error?: string
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  )
}

export async function createEventTypeAction(formData: FormData): Promise<ActionResult> {
  ensureDbReady()
  const parsed = eventTypeSchema.safeParse({
    slug: formData.get('slug'),
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    durationMinutes: formData.get('durationMinutes'),
    locationKind: formData.get('locationKind'),
    locationDetail: formData.get('locationDetail') ?? '',
    color: formData.get('color'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }
  if (slugTaken(parsed.data.slug)) {
    return { ok: false, error: 'Slug is already in use.' }
  }
  let created: { id: string }
  try {
    created = createEventType(parsed.data)
  } catch (err) {
    // Catch the slug-uniqueness race between the check above and this insert.
    if (isUniqueConstraintError(err)) {
      return { ok: false, error: 'Slug is already in use.' }
    }
    throw err
  }
  revalidatePath('/')
  redirect(`/event-types/${created.id}`)
}

export async function updateEventTypeAction(id: string, formData: FormData): Promise<ActionResult> {
  ensureDbReady()
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) {
    return { ok: false, error: 'Invalid event id.' }
  }
  const parsed = eventTypeSchema.safeParse({
    slug: formData.get('slug'),
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    durationMinutes: formData.get('durationMinutes'),
    locationKind: formData.get('locationKind'),
    locationDetail: formData.get('locationDetail') ?? '',
    color: formData.get('color'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }
  const existing = getEventType(id)
  if (!existing) return { ok: false, error: 'Event type not found.' }
  if (slugTaken(parsed.data.slug, id)) {
    return { ok: false, error: 'Slug is already in use.' }
  }
  try {
    updateEventType(id, parsed.data)
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { ok: false, error: 'Slug is already in use.' }
    }
    throw err
  }
  revalidatePath('/')
  revalidatePath(`/event-types/${id}`)
  redirect('/')
}

export async function deleteEventTypeAction(id: string): Promise<void> {
  ensureDbReady()
  if (typeof id === 'string' && id.length > 0 && id.length <= 64) {
    deleteEventType(id)
  }
  revalidatePath('/')
  redirect('/')
}

// --- availability -----------------------------------------------------------

const windowSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startMinute: z.coerce.number().int().min(0).max(1440),
  endMinute: z.coerce.number().int().min(0).max(1440),
})

const availabilitySchema = z.object({
  windows: z
    .array(windowSchema)
    .max(50)
    .refine((rows) => rows.every((r) => r.endMinute > r.startMinute), {
      message: 'End time must be after start time.',
    }),
})

export async function saveAvailabilityAction(input: {
  windows: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }>
}): Promise<ActionResult> {
  ensureDbReady()
  const parsed = availabilitySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid availability.' }
  }
  replaceAvailability(parsed.data.windows)
  revalidatePath('/')
  revalidatePath('/availability')
  return { ok: true }
}

// --- booking ----------------------------------------------------------------

const bookingSchema = z.object({
  eventTypeId: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date.' }),
  startMinute: z.coerce.number().int().min(0).max(1440),
  guestName: z.string().trim().min(1).max(MAX_GUEST_NAME),
  guestEmail: z
    .string()
    .trim()
    .max(MAX_GUEST_EMAIL)
    .regex(EMAIL_REGEX, { message: 'Invalid email address.' }),
  guestNote: z.string().trim().max(MAX_GUEST_NOTE).optional().default(''),
})

export type CreateBookingActionResult =
  | { ok: true; bookingId: string; cancelToken: string }
  | { ok: false; error: string; kind?: CreateBookingResult['kind'] }

export async function createBookingAction(input: {
  eventTypeId: string
  date: string
  startMinute: number
  guestName: string
  guestEmail: string
  guestNote?: string
}): Promise<CreateBookingActionResult> {
  ensureDbReady()
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }
  const event = getEventType(parsed.data.eventTypeId)
  if (!event) return { ok: false, error: 'Event type not found.' }

  // Availability is host-defined → use the SERVER's timezone for all slot
  // math. A client-supplied tz could shift the interpretation of weekly
  // windows, so we deliberately ignore any tz hint from the request.
  const timeZone = hostTimezone()
  let requestedStart: number
  try {
    requestedStart = localDateTimeToUtcMs(parsed.data.date, parsed.data.startMinute, timeZone)
  } catch {
    return { ok: false, error: 'Invalid date.' }
  }
  // DST-safe: end-of-day is the next local midnight, not "+24h" (fall-back
  // days are 25 hours wide).
  const dayStart = localDateTimeToUtcMs(parsed.data.date, 0, timeZone)
  const dayEnd = endOfDayMs(parsed.data.date, timeZone)

  // Defense in depth: re-derive the open slots and confirm the requested
  // start is still one of them. The booking write below is also
  // transactional, so this is a courtesy check that produces a better error.
  const windows = listAvailabilityWindows()
  const bookingsForDay = listActiveBookingsInRange(parsed.data.eventTypeId, dayStart, dayEnd)
  const openSlots = computeSlots({
    date: parsed.data.date,
    durationMinutes: event.durationMinutes,
    windows,
    bookings: bookingsForDay,
    nowMs: Date.now(),
    timeZone,
  })
  if (!openSlots.includes(requestedStart)) {
    return { ok: false, error: 'Slot is no longer available.' }
  }

  const result = createBookingGuarded({
    eventTypeId: parsed.data.eventTypeId,
    startAtMs: requestedStart,
    endAtMs: requestedStart + event.durationMinutes * 60_000,
    guestName: parsed.data.guestName,
    guestEmail: parsed.data.guestEmail,
    guestNote: parsed.data.guestNote ?? '',
  })
  if (result.kind !== 'ok') {
    return { ok: false, error: 'Slot is no longer available.', kind: result.kind }
  }
  revalidatePath('/')
  return { ok: true, bookingId: result.booking.id, cancelToken: result.booking.cancelToken }
}

const cancelSchema = z.object({
  token: z
    .string()
    .min(8)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, { message: 'Invalid token.' }),
})

export async function cancelBookingByTokenAction(token: string): Promise<ActionResult> {
  ensureDbReady()
  const parsed = cancelSchema.safeParse({ token })
  if (!parsed.success) return { ok: false, error: 'Invalid token.' }
  const booking = getBookingByCancelToken(parsed.data.token)
  if (!booking) return { ok: false, error: 'Booking not found.' }
  if (booking.cancelledAtMs !== null) return { ok: true }
  cancelBooking(booking.id)
  revalidatePath('/')
  return { ok: true }
}

/** Dedicated POST endpoint to create a fresh event type with sane defaults
 *  and redirect to its edit page. Used by the "新規イベント種別" button. */
export async function createBlankEventTypeAction(): Promise<never> {
  ensureDbReady()
  const baseSlug = 'new-event'
  let created: { id: string } | null = null
  // Retry a handful of times if the picked slug raced another concurrent
  // create. After that we give up rather than spinning forever.
  for (let attempt = 0; attempt < 20 && !created; attempt++) {
    let slug = baseSlug
    for (let i = 1; slugTaken(slug); i++) slug = `${baseSlug}-${i}`
    try {
      created = createEventType({
        slug,
        title: '新しいイベント種別',
        description: '',
        durationMinutes: 30,
        locationKind: 'video',
        locationDetail: '',
        color: 'zinc',
      })
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err
    }
  }
  if (!created) {
    throw new Error('Could not create event type after retrying.')
  }
  revalidatePath('/')
  redirect(`/event-types/${created.id}`)
}
