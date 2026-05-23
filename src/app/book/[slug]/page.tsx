import { CalendarClock, Clock, MapPin } from 'lucide-react'
import { notFound } from 'next/navigation'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import { ensureDbReady } from '@/lib/db/init'
import {
  getEventTypeBySlug,
  listActiveBookingsInRange,
  listAvailabilityWindows,
} from '@/lib/db/queries'
import { endOfDayMs } from '@/lib/scheduling/slots'
import { formatDateInTimeZone, hostTimezone } from '@/lib/scheduling/tz'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicBookingPage({ params }: PageProps) {
  ensureDbReady()
  const { slug } = await params
  const event = getEventTypeBySlug(slug)
  if (!event) notFound()

  const windows = listAvailabilityWindows()
  const now = Date.now()
  // Fetch bookings inside the calendar's visible horizon. The calendar
  // refuses to navigate past `rangeEnd` so users can't see stale "open"
  // days for months we didn't fetch occupancy for. Server-side booking
  // creation re-checks against the live DB regardless.
  //
  // The horizon is the END of the Nth host-local day so we don't show
  // partial occupancy on the last day (a booking at 23:30 wouldn't appear
  // if we cut at exactly `now + 60d`).
  const HORIZON_DAYS = 60
  const tz = hostTimezone()
  const horizonDate = formatDateInTimeZone(tz, now + HORIZON_DAYS * 24 * 60 * 60_000)
  const rangeStart = now - 7 * 24 * 60 * 60_000
  const rangeEnd = endOfDayMs(horizonDate, tz)
  const bookings = listActiveBookingsInRange(event.id, rangeStart, rangeEnd).map((b) => ({
    startAtMs: b.startAtMs,
    endAtMs: b.endAtMs,
  }))

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
          <CalendarClock className="size-5 text-zinc-700" /> {event.title}
        </h1>
        {event.description && (
          <p className="mt-2 max-w-prose text-sm text-zinc-600">{event.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {event.durationMinutes}分
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" /> {event.locationKind}
          </span>
        </div>
      </header>

      <BookingCalendar
        slug={event.slug}
        durationMinutes={event.durationMinutes}
        windows={windows}
        bookings={bookings}
        nowMsServer={now}
        hostTimeZone={tz}
        horizonIsoDate={horizonDate}
      />
    </div>
  )
}
