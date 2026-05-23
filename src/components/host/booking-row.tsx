import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Booking, EventType } from '@/lib/db/schema'
import { formatBookingShort } from '@/lib/scheduling/format'

interface BookingRowProps {
  booking: Booking
  event: EventType | undefined
}

export function BookingRow({ booking, event }: BookingRowProps) {
  const cancelled = booking.cancelledAtMs !== null
  return (
    <li className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900">{booking.guestName}</span>
          <span className="text-xs text-zinc-500">{booking.guestEmail}</span>
          {cancelled && (
            <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-700">
              cancelled
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-zinc-600">
          {formatBookingShort(booking.startAtMs)} — {event?.title ?? '(deleted event)'}
        </div>
        {booking.guestNote && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{booking.guestNote}</p>
        )}
      </div>
      {!cancelled && (
        <Button asChild size="sm" variant="ghost">
          <Link href={`/cancel/${booking.cancelToken}`}>キャンセル</Link>
        </Button>
      )}
    </li>
  )
}
