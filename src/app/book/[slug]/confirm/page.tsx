import { ArrowLeft, Clock, MapPin } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookingForm } from '@/components/booking/booking-form'
import { ensureDbReady } from '@/lib/db/init'
import {
  getEventTypeBySlug,
  listActiveBookingsInRange,
  listAvailabilityWindows,
} from '@/lib/db/queries'
import { computeSlots, endOfDayMs, localDateTimeToUtcMs } from '@/lib/scheduling/slots'
import { hostTimezone } from '@/lib/scheduling/tz'
import { formatHHMM } from '@/lib/scheduling/validate'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ date?: string; start?: string }>
}

export default async function ConfirmPage({ params, searchParams }: PageProps) {
  ensureDbReady()
  const { slug } = await params
  const { date, start } = await searchParams
  if (!date || !start) redirect(`/book/${slug}`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) redirect(`/book/${slug}`)
  const startMinute = Number(start)
  if (!Number.isFinite(startMinute) || startMinute < 0 || startMinute > 1440) {
    redirect(`/book/${slug}`)
  }

  const event = getEventTypeBySlug(slug)
  if (!event) notFound()

  const timeZone = hostTimezone()
  let requestedStart: number
  let dayStartMs: number
  let dayEndMs: number
  try {
    requestedStart = localDateTimeToUtcMs(date, startMinute, timeZone)
    dayStartMs = localDateTimeToUtcMs(date, 0, timeZone)
    // Use end-of-local-day rather than +24h so DST fall-back days still
    // cover their full 25 hours of bookings.
    dayEndMs = endOfDayMs(date, timeZone)
  } catch {
    redirect(`/book/${slug}`)
  }
  const windows = listAvailabilityWindows()
  const bookings = listActiveBookingsInRange(event.id, dayStartMs, dayEndMs)
  const openSlots = computeSlots({
    date,
    durationMinutes: event.durationMinutes,
    windows,
    bookings,
    nowMs: Date.now(),
    timeZone,
  })
  if (!openSlots.includes(requestedStart)) {
    redirect(`/book/${slug}?taken=1`)
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <Link
        href={`/book/${slug}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" /> 戻る
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900">予約の確認</h1>
      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
        <div className="font-medium text-zinc-900">{event.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {date} {formatHHMM(startMinute)}〜
            {formatHHMM(startMinute + event.durationMinutes)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" /> {event.locationKind}
          </span>
        </div>
      </div>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
        <BookingForm slug={slug} eventTypeId={event.id} date={date} startMinute={startMinute} />
      </div>
    </div>
  )
}
