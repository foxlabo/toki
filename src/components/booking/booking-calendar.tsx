'use client'

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { AvailabilityWindow, BookingSlot } from '@/lib/scheduling/slots'
import { computeSlots } from '@/lib/scheduling/slots'
import { cn } from '@/lib/utils'

interface BookingCalendarProps {
  slug: string
  durationMinutes: number
  windows: AvailabilityWindow[]
  /** Active bookings for this event type that fall in a wide range around
   *  now. The component re-filters per displayed date in-memory. */
  bookings: BookingSlot[]
  /** Server-side rendered "now" so the client computes the same initial set
   *  of slots before re-evaluating with its own clock. */
  nowMsServer: number
  /** Host IANA timezone (server-owned). Slot enumeration uses this for ALL
   *  guests — a guest in another timezone sees host-local times. */
  hostTimeZone: string
  /** INCLUSIVE last bookable host-local date (YYYY-MM-DD). The calendar
   *  refuses to navigate to months whose first day is after this, and
   *  individual cells past this date are non-clickable. Passing a date
   *  string instead of an exclusive ms instant avoids off-by-one errors
   *  at host-local midnight. */
  horizonIsoDate: string
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

function isoDateForHost(ms: number, timeZone: string): string {
  // en-CA renders ISO-style YYYY-MM-DD.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date(ms))
}

interface YearMonthDay {
  y: number
  m: number // 1..12
  d: number
}

function parts(iso: string): YearMonthDay {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

function isoFromParts(p: YearMonthDay): string {
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

function addDays(p: YearMonthDay, n: number): YearMonthDay {
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d))
  d.setUTCDate(d.getUTCDate() + n)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
}

function dayOfWeek(p: YearMonthDay): number {
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()
}

export function BookingCalendar({
  slug,
  durationMinutes,
  windows,
  bookings,
  nowMsServer,
  hostTimeZone,
  horizonIsoDate,
}: BookingCalendarProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [nowMs, setNowMs] = useState<number>(nowMsServer)
  useEffect(() => {
    // Drift the client clock onto the local one (still computing slots in the
    // host's tz, so this just refines "past slot" filtering).
    setNowMs(Date.now())
  }, [])

  const todayIso = useMemo(() => isoDateForHost(nowMs, hostTimeZone), [nowMs, hostTimeZone])
  const today = useMemo(() => parts(todayIso), [todayIso])
  const horizonIso = horizonIsoDate
  const horizon = useMemo(() => parts(horizonIso), [horizonIso])
  const [viewYear, setViewYear] = useState(today.y)
  const [viewMonth, setViewMonth] = useState(today.m)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Block month navigation past the data horizon. Past months are also
  // blocked since slots there are by-definition past.
  const atPastEdge = viewYear < today.y || (viewYear === today.y && viewMonth <= today.m)
  const atFutureEdge = viewYear > horizon.y || (viewYear === horizon.y && viewMonth >= horizon.m)

  // 6-week grid starting on the Sunday on or before the 1st of the view month.
  const gridStart = useMemo(() => {
    const first: YearMonthDay = { y: viewYear, m: viewMonth, d: 1 }
    const dow = dayOfWeek(first)
    return addDays(first, -dow)
  }, [viewYear, viewMonth])

  const days = useMemo(() => {
    const out: YearMonthDay[] = []
    for (let i = 0; i < 42; i++) out.push(addDays(gridStart, i))
    return out
  }, [gridStart])

  const daysOpen = useMemo(() => {
    const out = new Map<string, boolean>()
    for (const p of days) {
      const iso = isoFromParts(p)
      const slots = computeSlots({
        date: iso,
        durationMinutes,
        windows,
        bookings,
        nowMs,
        timeZone: hostTimeZone,
      })
      out.set(iso, slots.length > 0)
    }
    return out
  }, [days, durationMinutes, windows, bookings, nowMs, hostTimeZone])

  const slotsForSelected = useMemo(() => {
    if (!selectedDate) return []
    return computeSlots({
      date: selectedDate,
      durationMinutes,
      windows,
      bookings,
      nowMs,
      timeZone: hostTimeZone,
    })
  }, [selectedDate, durationMinutes, windows, bookings, nowMs, hostTimeZone])

  function goPrev() {
    if (viewMonth === 1) {
      setViewMonth(12)
      setViewYear((y) => y - 1)
    } else setViewMonth((m) => m - 1)
  }
  function goNext() {
    if (viewMonth === 12) {
      setViewMonth(1)
      setViewYear((y) => y + 1)
    } else setViewMonth((m) => m + 1)
  }

  function pickSlot(startAtMs: number) {
    if (!selectedDate) return
    // Pull hour/minute via formatToParts with the 00-23 cycle so we never
    // get "24:00" (which some Intl runtimes emit for midnight under hour12:
    // false). Modulo 24 normalizes any remaining edge cases.
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: hostTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    let h = 0
    let m = 0
    for (const part of fmt.formatToParts(new Date(startAtMs))) {
      if (part.type === 'hour') h = Number(part.value) % 24
      else if (part.type === 'minute') m = Number(part.value)
    }
    const startMinute = h * 60 + m
    const qs = new URLSearchParams({ date: selectedDate, start: String(startMinute) })
    startTransition(() => {
      router.push(`/book/${slug}/confirm?${qs.toString()}`)
    })
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={goPrev}
            aria-label="前月"
            disabled={atPastEdge}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-sm font-semibold text-zinc-900">
            {viewYear}年{viewMonth}月
          </h2>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={goNext}
            aria-label="翌月"
            disabled={atFutureEdge}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-1 font-medium text-zinc-500">
              {d}
            </div>
          ))}
          {days.map((p) => {
            const iso = isoFromParts(p)
            const inMonth = p.m === viewMonth
            const beyondHorizon = iso > horizonIso
            const open = (daysOpen.get(iso) ?? false) && !beyondHorizon
            const isSelected = selectedDate === iso
            const isToday = todayIso === iso
            return (
              <button
                key={iso}
                type="button"
                onClick={() => open && setSelectedDate(iso)}
                disabled={!open || !inMonth}
                className={cn(
                  'aspect-square rounded-md p-1 text-center text-xs transition-colors',
                  !inMonth && 'text-zinc-300',
                  inMonth && !open && 'text-zinc-300',
                  inMonth && open && 'text-zinc-900 hover:bg-emerald-100',
                  isSelected && 'bg-zinc-900 text-white hover:bg-zinc-900',
                  isToday && !isSelected && 'ring-1 ring-zinc-400',
                )}
                aria-label={`${iso}${open ? '（予約可）' : ''}`}
              >
                {p.d}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">
          {selectedDate ? `${selectedDate}` : '日付を選んでください'}
        </h3>
        <p className="mb-3 text-[10px] uppercase tracking-wide text-zinc-500">
          host tz: {hostTimeZone}
        </p>
        {!selectedDate ? (
          <p className="text-xs text-zinc-500">
            左のカレンダーで空きのある日を選ぶと、ここに時間枠が表示されます。
          </p>
        ) : slotsForSelected.length === 0 ? (
          <p className="text-xs text-zinc-500">この日は空きがありません。</p>
        ) : (
          <ul className="grid gap-1.5">
            {slotsForSelected.map((startAtMs) => {
              const labelFmt = new Intl.DateTimeFormat('en-US', {
                timeZone: hostTimeZone,
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
              })
              let lh = 0
              let lm = 0
              for (const part of labelFmt.formatToParts(new Date(startAtMs))) {
                if (part.type === 'hour') lh = Number(part.value) % 24
                else if (part.type === 'minute') lm = Number(part.value)
              }
              const label = `${String(lh).padStart(2, '0')}:${String(lm).padStart(2, '0')}`
              return (
                <li key={startAtMs}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => pickSlot(startAtMs)}
                    disabled={pending}
                  >
                    <span>{label}</span>
                    <span className="text-xs text-zinc-500">{durationMinutes}分</span>
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        {pending && (
          <p className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
            <Loader2 className="size-3 animate-spin" /> 移動中…
          </p>
        )}
      </div>
    </div>
  )
}
