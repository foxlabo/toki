import { CalendarX2, CheckCircle2, Clock, MapPin } from 'lucide-react'
import { notFound } from 'next/navigation'
import { CancelForm } from '@/components/booking/cancel-form'
import { ensureDbReady } from '@/lib/db/init'
import { getBookingByCancelToken, getEventType } from '@/lib/db/queries'
import { formatBookingDateTime } from '@/lib/scheduling/format'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

/** Cancel tokens are nanoid(32) — keep the lookup bounded so a hostile URL
 *  like /cancel/<10kb-of-junk> doesn't reach the DB. */
const TOKEN_REGEX = /^[A-Za-z0-9_-]{8,64}$/

export default async function CancelPage({ params }: PageProps) {
  ensureDbReady()
  const { token } = await params
  if (!TOKEN_REGEX.test(token)) notFound()
  const booking = getBookingByCancelToken(token)
  if (!booking) notFound()
  const event = getEventType(booking.eventTypeId)

  const cancelled = booking.cancelledAtMs !== null

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
        <CalendarX2 className="size-5 text-zinc-700" /> 予約のキャンセル
      </h1>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
        <div className="font-medium text-zinc-900">{event?.title ?? '(deleted event)'}</div>
        <div className="mt-2 flex flex-col gap-1 text-xs text-zinc-600">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {formatBookingDateTime(booking.startAtMs)}
          </span>
          {event && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> {event.locationKind}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6">
        {cancelled ? (
          <div className="flex items-center gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            <CheckCircle2 className="size-4" /> この予約はすでにキャンセル済みです。
          </div>
        ) : (
          <CancelForm token={token} />
        )}
      </div>
    </div>
  )
}
