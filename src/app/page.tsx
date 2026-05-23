import { CalendarClock, Clock, Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { BookingRow } from '@/components/host/booking-row'
import { EventTypeCard } from '@/components/host/event-type-card'
import { Button } from '@/components/ui/button'
import { ensureDbReady } from '@/lib/db/init'
import { listEventTypes, listRecentBookings, listUpcomingBookings } from '@/lib/db/queries'

// Always render fresh from local SQLite.
export const dynamic = 'force-dynamic'

export default function HomePage() {
  ensureDbReady()
  const events = listEventTypes()
  const upcoming = listUpcomingBookings()
  const recent = listRecentBookings(10)
  const eventById = new Map(events.map((e) => [e.id, e]))

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <CalendarClock className="size-4 text-zinc-700" /> Toki
          </Link>
          <nav className="flex items-center gap-1">
            <Button asChild size="sm" variant="ghost">
              <Link href="/bookings">予約一覧</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/availability">
                <Settings className="size-3.5" /> 営業時間
              </Link>
            </Button>
            <Button asChild size="sm" variant="default">
              <Link href="/event-types/new">
                <Plus className="size-3.5" /> 新規イベント種別
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h1 className="text-xl font-semibold text-zinc-900">イベント種別</h1>
            <Link href="/event-types/new" className="text-xs text-zinc-600 hover:text-zinc-900">
              + 追加
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
              イベント種別がまだありません。「新規イベント種別」から作成してください。
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((ev) => (
                <EventTypeCard key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Clock className="size-4" /> 今後の予約 ({upcoming.length})
            </h2>
            <div className="rounded-md border border-zinc-200 bg-white">
              {upcoming.length === 0 ? (
                <p className="p-4 text-sm text-zinc-500">予定された予約はありません。</p>
              ) : (
                <ul>
                  {upcoming.slice(0, 8).map((b) => (
                    <BookingRow key={b.id} booking={b} event={eventById.get(b.eventTypeId)} />
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <CalendarClock className="size-4" /> 最近の動き
            </h2>
            <div className="rounded-md border border-zinc-200 bg-white">
              {recent.length === 0 ? (
                <p className="p-4 text-sm text-zinc-500">予約はまだありません。</p>
              ) : (
                <ul>
                  {recent.map((b) => (
                    <BookingRow key={b.id} booking={b} event={eventById.get(b.eventTypeId)} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
