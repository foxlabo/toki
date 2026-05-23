import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { BookingRow } from '@/components/host/booking-row'
import { ensureDbReady } from '@/lib/db/init'
import { listEventTypes, listRecentBookings } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export default function BookingsPage() {
  ensureDbReady()
  const bookings = listRecentBookings(200)
  const events = listEventTypes()
  const eventById = new Map(events.map((e) => [e.id, e]))

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" /> 戻る
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900">予約一覧</h1>
      <p className="mt-1 text-sm text-zinc-600">直近 200 件まで表示します。</p>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white">
        {bookings.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">予約はまだありません。</p>
        ) : (
          <ul>
            {bookings.map((b) => (
              <BookingRow key={b.id} booking={b} event={eventById.get(b.eventTypeId)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
