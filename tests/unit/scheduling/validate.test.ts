import { describe, expect, it } from 'vitest'
import {
  EMAIL_REGEX,
  formatHHMM,
  isColorToken,
  isLocationKind,
  parseHHMM,
  SLUG_REGEX,
} from '@/lib/scheduling/validate'

describe('SLUG_REGEX', () => {
  it.each(['30min', 'one-on-one', 'a', '1', 'abc-123'])('accepts %s', (s) => {
    expect(SLUG_REGEX.test(s)).toBe(true)
  })

  it.each(['-leading', 'trailing-', 'Cap', 'sp ace', '', '-', 'under_score'])('rejects %s', (s) => {
    expect(SLUG_REGEX.test(s)).toBe(false)
  })
})

describe('EMAIL_REGEX', () => {
  it.each(['a@b.co', 'first.last@example.jp', 'x+y@z.io'])('accepts %s', (s) => {
    expect(EMAIL_REGEX.test(s)).toBe(true)
  })

  it.each(['nope', 'no-at.com', 'a@b', 'a b@c.com', '@b.com', 'a@.com'])('rejects %s', (s) => {
    expect(EMAIL_REGEX.test(s)).toBe(false)
  })
})

describe('parseHHMM / formatHHMM', () => {
  it('parses common forms', () => {
    expect(parseHHMM('9')).toBe(9 * 60)
    expect(parseHHMM('09:00')).toBe(9 * 60)
    expect(parseHHMM('23:59')).toBe(23 * 60 + 59)
    expect(parseHHMM('24:00')).toBe(24 * 60)
  })

  it('rejects garbage', () => {
    expect(parseHHMM('foo')).toBeNull()
    expect(parseHHMM('25:00')).toBeNull()
    expect(parseHHMM('10:60')).toBeNull()
    expect(parseHHMM('')).toBeNull()
  })

  it('round-trips through format', () => {
    expect(formatHHMM(parseHHMM('09:30') as number)).toBe('09:30')
    expect(formatHHMM(0)).toBe('00:00')
    expect(formatHHMM(24 * 60)).toBe('24:00')
  })
})

describe('isLocationKind / isColorToken', () => {
  it('admits known values only', () => {
    expect(isLocationKind('video')).toBe(true)
    expect(isLocationKind('telepathy')).toBe(false)
    expect(isColorToken('emerald')).toBe(true)
    expect(isColorToken('chartreuse')).toBe(false)
  })
})
