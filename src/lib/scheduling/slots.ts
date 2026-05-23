/**
 * Pure slot computation. Given a date, a duration, the weekly availability
 * windows, the existing active bookings, "now", and the host's IANA
 * timezone, return the open slot start times (UTC ms) for that date.
 *
 * All inputs are deterministic so unit tests can pin a specific tz/date.
 */

import { getOffsetMinutesAt, partsInTimeZone } from './tz'

export interface AvailabilityWindow {
  /** 0 = Sunday … 6 = Saturday in the host's timezone. */
  dayOfWeek: number
  /** Minutes from midnight in the host's timezone, 0..1440. */
  startMinute: number
  endMinute: number
}

export interface BookingSlot {
  startAtMs: number
  endAtMs: number
}

export interface ComputeSlotsInput {
  /** ISO date 'YYYY-MM-DD' interpreted in the host's timezone. */
  date: string
  durationMinutes: number
  windows: AvailabilityWindow[]
  bookings: BookingSlot[]
  /** Current epoch ms — used to drop already-started slots. */
  nowMs: number
  /** Host IANA timezone, e.g. 'Asia/Tokyo'. */
  timeZone: string
}

/** Compose the UTC ms timestamp of `YYYY-MM-DD HH:MM` interpreted in the
 *  host's timezone. Handles DST by refining the offset at the resolved
 *  UTC instant (the offset at midnight may differ from the offset 9 hours
 *  later when the spring-forward jump happened). */
export function localDateTimeToUtcMs(
  date: string,
  minutesFromMidnight: number,
  timeZone: string,
): number {
  const [yStr, mStr, dStr] = date.split('-')
  const year = Number(yStr)
  const month = Number(mStr)
  const day = Number(dStr)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error(`Invalid date: ${date}`)
  }
  if (year < 1970 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date: ${date}`)
  }
  // Date.UTC normalizes "2026-02-31" silently; round-trip catches that.
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date: ${date}`)
  }
  const hour = Math.floor(minutesFromMidnight / 60)
  const minute = minutesFromMidnight % 60
  // Treat the local clock as if it were UTC, then subtract the offset.
  const naiveMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  let offset = getOffsetMinutesAt(timeZone, naiveMs)
  let utcMs = naiveMs - offset * 60_000
  // Refine across DST jumps: the offset at the actual UTC instant may differ
  // from the offset at the naive instant.
  const refinedOffset = getOffsetMinutesAt(timeZone, utcMs)
  if (refinedOffset !== offset) {
    offset = refinedOffset
    utcMs = naiveMs - offset * 60_000
  }
  // Round-trip check: format the resolved UTC instant back in `timeZone` and
  // confirm it matches the requested wall time. A non-match means the
  // requested local time falls in a DST spring-forward gap (e.g. 02:30 on a
  // day that jumps 02:00→03:00) and does not exist as a clock reading.
  const back = partsInTimeZone(timeZone, utcMs)
  if (
    back.year !== year ||
    back.month !== month ||
    back.day !== day ||
    back.hour !== hour % 24 ||
    back.minute !== minute
  ) {
    // 24:00 is allowed as an exclusive upper bound. The only legitimate way
    // back.hour can differ from `hour` is when `hour === 24` (rolling over
    // to 00:00 the next day); accept that one case explicitly.
    if (!(hour === 24 && minute === 0 && back.hour === 0)) {
      throw new Error(`Local time ${date} ${formatHM(hour, minute)} does not exist in ${timeZone}`)
    }
  }
  return utcMs
}

function formatHM(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Day-of-week (0=Sun..6=Sat) of `YYYY-MM-DD` interpreted in the host's TZ. */
export function dayOfWeekForDate(date: string, timeZone: string): number {
  const ms = localDateTimeToUtcMs(date, 0, timeZone)
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' })
  const name = fmt.format(new Date(ms))
  const idx = WEEKDAY_SHORT.indexOf(name)
  return idx === -1 ? 0 : idx
}

/** Add one civil day to `YYYY-MM-DD`. Returns `YYYY-MM-DD` (still in the
 *  host's TZ — civil-date arithmetic, no offset math). */
export function nextDate(date: string): string {
  const [yStr, mStr, dStr] = date.split('-')
  const year = Number(yStr)
  const month = Number(mStr)
  const day = Number(dStr)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + 1)
  const y = d.getUTCFullYear()
  const mo = d.getUTCMonth() + 1
  const da = d.getUTCDate()
  return `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`
}

/** UTC ms at the start of the next host-local day. DST-correct (handles
 *  the 25-hour fall-back day by using `localDateTimeToUtcMs(nextDate, 0)`
 *  instead of `dayStart + 24h`). */
export function endOfDayMs(date: string, timeZone: string): number {
  return localDateTimeToUtcMs(nextDate(date), 0, timeZone)
}

export function computeSlots(input: ComputeSlotsInput): number[] {
  const { date, durationMinutes, windows, bookings, nowMs, timeZone } = input
  if (durationMinutes <= 0) return []
  const dow = dayOfWeekForDate(date, timeZone)
  const todaysWindows = windows.filter((w) => w.dayOfWeek === dow)
  if (todaysWindows.length === 0) return []

  const out: number[] = []
  for (const w of todaysWindows) {
    if (w.endMinute <= w.startMinute) continue
    for (let m = w.startMinute; m + durationMinutes <= w.endMinute; m += durationMinutes) {
      let startAtMs: number
      try {
        startAtMs = localDateTimeToUtcMs(date, m, timeZone)
      } catch {
        // Local time doesn't exist in this timezone (DST spring-forward gap).
        // Skip the slot rather than letting the whole day fail.
        continue
      }
      const endAtMs = startAtMs + durationMinutes * 60_000
      if (startAtMs <= nowMs) continue
      let conflict = false
      for (const b of bookings) {
        if (b.startAtMs < endAtMs && b.endAtMs > startAtMs) {
          conflict = true
          break
        }
      }
      if (conflict) continue
      out.push(startAtMs)
    }
  }
  return Array.from(new Set(out)).sort((a, b) => a - b)
}
