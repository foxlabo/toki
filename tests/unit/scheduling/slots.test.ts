import { describe, expect, it } from 'vitest'
import {
  computeSlots,
  dayOfWeekForDate,
  endOfDayMs,
  localDateTimeToUtcMs,
  nextDate,
} from '@/lib/scheduling/slots'

const JST = 'Asia/Tokyo' // UTC+9, no DST.

describe('localDateTimeToUtcMs', () => {
  it('converts a JST clock time to the matching UTC epoch', () => {
    // 2026-06-01 09:00 JST = 2026-06-01 00:00 UTC.
    const ms = localDateTimeToUtcMs('2026-06-01', 9 * 60, JST)
    expect(new Date(ms).toISOString()).toBe('2026-06-01T00:00:00.000Z')
  })

  it('rejects malformed dates', () => {
    expect(() => localDateTimeToUtcMs('not-a-date', 0, JST)).toThrow()
  })

  it('rejects normalized-but-invalid dates like 2026-02-31', () => {
    expect(() => localDateTimeToUtcMs('2026-02-31', 0, JST)).toThrow()
    expect(() => localDateTimeToUtcMs('2026-13-01', 0, JST)).toThrow()
    expect(() => localDateTimeToUtcMs('2026-04-31', 0, JST)).toThrow()
  })

  it('crosses a DST spring-forward correctly (America/New_York 2026-03-08)', () => {
    // At 2:00 local on 2026-03-08 the clock jumps to 3:00 (UTC-5 -> UTC-4).
    // A booking at 09:00 local should resolve to 13:00 UTC, not 14:00.
    const ms = localDateTimeToUtcMs('2026-03-08', 9 * 60, 'America/New_York')
    expect(new Date(ms).toISOString()).toBe('2026-03-08T13:00:00.000Z')
  })

  it('rejects local times that fall in a DST spring-forward gap', () => {
    // 2026-03-08 02:30 America/New_York does not exist as a wall clock.
    expect(() => localDateTimeToUtcMs('2026-03-08', 2 * 60 + 30, 'America/New_York')).toThrow()
  })
})

describe('nextDate / endOfDayMs', () => {
  it('advances civil days, including across month boundaries', () => {
    expect(nextDate('2026-01-31')).toBe('2026-02-01')
    expect(nextDate('2024-02-29')).toBe('2024-03-01') // leap year
    expect(nextDate('2026-12-31')).toBe('2027-01-01')
  })

  it('endOfDayMs on a DST fall-back day is 25 hours after start', () => {
    // 2026-11-01 in America/New_York: clocks roll back 02:00 -> 01:00.
    // The local day is 25 hours long, not 24.
    const start = localDateTimeToUtcMs('2026-11-01', 0, 'America/New_York')
    const end = endOfDayMs('2026-11-01', 'America/New_York')
    expect(end - start).toBe(25 * 60 * 60_000)
  })

  it('endOfDayMs on a DST spring-forward day is 23 hours after start', () => {
    const start = localDateTimeToUtcMs('2026-03-08', 0, 'America/New_York')
    const end = endOfDayMs('2026-03-08', 'America/New_York')
    expect(end - start).toBe(23 * 60 * 60_000)
  })
})

describe('computeSlots — DST', () => {
  it('omits phantom slots during a spring-forward gap', () => {
    // Window covers the spring-forward hour in NY 2026-03-08:
    // 01:00..04:00. With 30-min slots we should see 01:00, 01:30 (real),
    // 03:00, 03:30 — but NOT 02:00 or 02:30 (skipped).
    const slots = computeSlots({
      date: '2026-03-08',
      durationMinutes: 30,
      windows: [{ dayOfWeek: 0, startMinute: 60, endMinute: 4 * 60 }],
      bookings: [],
      nowMs: 0,
      timeZone: 'America/New_York',
    })
    // We expect exactly 4 slots, not 6.
    expect(slots).toHaveLength(4)
  })
})

describe('dayOfWeekForDate', () => {
  it('returns Monday = 1 for 2026-06-01 in JST', () => {
    expect(dayOfWeekForDate('2026-06-01', JST)).toBe(1)
  })

  it('returns Sunday = 0 for 2026-06-07 in JST', () => {
    expect(dayOfWeekForDate('2026-06-07', JST)).toBe(0)
  })
})

describe('computeSlots', () => {
  const dayWindows = [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 11 * 60 }]
  const farFuture = localDateTimeToUtcMs('2020-01-01', 0, JST)

  it('returns an empty list when no window covers the day', () => {
    const slots = computeSlots({
      date: '2026-06-07', // Sunday
      durationMinutes: 30,
      windows: dayWindows,
      bookings: [],
      nowMs: farFuture,
      timeZone: JST,
    })
    expect(slots).toEqual([])
  })

  it('steps slots by duration through the window', () => {
    const slots = computeSlots({
      date: '2026-06-01', // Monday
      durationMinutes: 30,
      windows: dayWindows,
      bookings: [],
      nowMs: farFuture,
      timeZone: JST,
    })
    // 9:00, 9:30, 10:00, 10:30 → 4 slots.
    expect(slots).toHaveLength(4)
    expect(new Date(slots[0]).toISOString()).toBe('2026-06-01T00:00:00.000Z')
    expect(new Date(slots[3]).toISOString()).toBe('2026-06-01T01:30:00.000Z')
  })

  it('omits slots that overlap an existing booking', () => {
    const bookingStart = localDateTimeToUtcMs('2026-06-01', 9 * 60 + 30, JST)
    const slots = computeSlots({
      date: '2026-06-01',
      durationMinutes: 30,
      windows: dayWindows,
      bookings: [{ startAtMs: bookingStart, endAtMs: bookingStart + 30 * 60_000 }],
      nowMs: farFuture,
      timeZone: JST,
    })
    expect(slots.map((s) => new Date(s).toISOString())).toEqual([
      '2026-06-01T00:00:00.000Z',
      '2026-06-01T01:00:00.000Z',
      '2026-06-01T01:30:00.000Z',
    ])
  })

  it('drops slots that have already started', () => {
    const now = localDateTimeToUtcMs('2026-06-01', 10 * 60, JST)
    const slots = computeSlots({
      date: '2026-06-01',
      durationMinutes: 30,
      windows: dayWindows,
      bookings: [],
      nowMs: now,
      timeZone: JST,
    })
    expect(slots.map((s) => new Date(s).toISOString())).toEqual(['2026-06-01T01:30:00.000Z'])
  })

  it('returns no slots when the duration does not fit the window', () => {
    const slots = computeSlots({
      date: '2026-06-01',
      durationMinutes: 180,
      windows: dayWindows,
      bookings: [],
      nowMs: farFuture,
      timeZone: JST,
    })
    expect(slots).toEqual([])
  })

  it('handles multiple windows per day and dedupes overlaps', () => {
    const windows = [
      { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 10 * 60 },
      { dayOfWeek: 1, startMinute: 9 * 60 + 30, endMinute: 11 * 60 },
    ]
    const slots = computeSlots({
      date: '2026-06-01',
      durationMinutes: 30,
      windows,
      bookings: [],
      nowMs: farFuture,
      timeZone: JST,
    })
    expect(slots).toHaveLength(4)
  })

  it('returns an empty list for zero or negative duration', () => {
    const slots = computeSlots({
      date: '2026-06-01',
      durationMinutes: 0,
      windows: dayWindows,
      bookings: [],
      nowMs: farFuture,
      timeZone: JST,
    })
    expect(slots).toEqual([])
  })
})
