/** URL-safe slug regex: lowercase letters, digits, dash. 2–48 chars. */
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/

/** Loose RFC-5322-ish guard. We deliberately keep this conservative — the
 *  app never sends mail, the address is just shown back to the host. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const LOCATION_KINDS = ['in-person', 'video', 'phone'] as const
export type LocationKind = (typeof LOCATION_KINDS)[number]

export const COLOR_TOKENS = ['zinc', 'emerald', 'indigo', 'amber', 'rose', 'sky'] as const
export type ColorToken = (typeof COLOR_TOKENS)[number]

export function isLocationKind(value: string): value is LocationKind {
  return (LOCATION_KINDS as readonly string[]).includes(value)
}

export function isColorToken(value: string): value is ColorToken {
  return (COLOR_TOKENS as readonly string[]).includes(value)
}

/** Convert "9:30" / "09:30" / "23" to minutes from midnight. Returns null
 *  for invalid input. */
export function parseHHMM(raw: string): number | null {
  const trimmed = raw.trim()
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(trimmed)
  if (!match) return null
  const h = Number(match[1])
  const m = match[2] ? Number(match[2]) : 0
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  if (h < 0 || h > 24) return null
  if (m < 0 || m >= 60) return null
  const total = h * 60 + m
  if (total < 0 || total > 1440) return null
  return total
}

export function formatHHMM(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60)
  const m = minutesFromMidnight % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
