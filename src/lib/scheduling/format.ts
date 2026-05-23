import { hostTimezone } from './tz'

/** Format a booking time for display, anchored to the host timezone so it
 *  never depends on the viewer's browser locale clock. */
export function formatBookingDateTime(ms: number): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: hostTimezone(),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ms))
}

export function formatBookingShort(ms: number): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: hostTimezone(),
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ms))
}
