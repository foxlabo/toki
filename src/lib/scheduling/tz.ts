/**
 * Host-timezone helpers. Availability is interpreted in the HOST's IANA
 * timezone (so DST boundaries land on the right side and a client can't
 * shift the interpretation of windows by sending a different offset).
 *
 * The host TZ is server-owned, sourced from `TOKI_TIMEZONE` if set or the
 * server's local zone otherwise.
 */

const OFFSET_REGEX = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/

/** Minutes east of UTC for `timeZone` at the supplied UTC instant.
 *  Returns `+540` for Asia/Tokyo. */
export function getOffsetMinutesAt(timeZone: string, utcMs: number): number {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
  const parts = fmt.formatToParts(new Date(utcMs))
  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00'
  // Some runtimes return just "GMT" for UTC.
  if (tzPart === 'GMT' || tzPart === 'UTC') return 0
  const match = OFFSET_REGEX.exec(tzPart)
  if (!match) return 0
  const sign = match[1] === '+' ? 1 : -1
  const h = Number(match[2])
  const m = match[3] ? Number(match[3]) : 0
  return sign * (h * 60 + m)
}

/** Format a UTC ms instant as "YYYY-MM-DD HH:mm" interpreted in `timeZone`,
 *  using the 00-23 hour cycle so midnight is "00:00" everywhere. Returned as
 *  parts so callers can compare without string-format quirks. */
export interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export function partsInTimeZone(timeZone: string, utcMs: number): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const out: Partial<LocalParts> = {}
  for (const part of fmt.formatToParts(new Date(utcMs))) {
    if (part.type === 'year') out.year = Number(part.value)
    else if (part.type === 'month') out.month = Number(part.value)
    else if (part.type === 'day') out.day = Number(part.value)
    else if (part.type === 'hour') out.hour = Number(part.value) % 24
    else if (part.type === 'minute') out.minute = Number(part.value)
  }
  return {
    year: out.year ?? 1970,
    month: out.month ?? 1,
    day: out.day ?? 1,
    hour: out.hour ?? 0,
    minute: out.minute ?? 0,
  }
}

/** "HH:mm" of a UTC ms instant in `timeZone`, with the 00-23 hour cycle. */
export function formatTimeInTimeZone(timeZone: string, utcMs: number): string {
  const p = partsInTimeZone(timeZone, utcMs)
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

/** "YYYY-MM-DD" date label in `timeZone`. */
export function formatDateInTimeZone(timeZone: string, utcMs: number): string {
  const p = partsInTimeZone(timeZone, utcMs)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Server-side resolver. Cached at module init — only changes on restart. */
let cachedHostTimezone: string | null = null
export function hostTimezone(): string {
  if (cachedHostTimezone !== null) return cachedHostTimezone
  const envTz = process.env.TOKI_TIMEZONE
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const value = (envTz && envTz.length > 0 ? envTz : fallback) ?? 'UTC'
  // Probe so an invalid env value fails loudly at startup rather than silently
  // when the first booking arrives.
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0)
  } catch {
    cachedHostTimezone = 'UTC'
    return cachedHostTimezone
  }
  cachedHostTimezone = value
  return cachedHostTimezone
}
