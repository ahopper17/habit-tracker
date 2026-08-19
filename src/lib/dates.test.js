import { describe, it, expect } from 'vitest'
import { toKey, todayKey, fromKey, addDays, lastNDays, dayOfWeek, labelParts } from './dates.js'

describe('toKey', () => {
  it('zero-pads month and day', () => {
    expect(toKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('uses local time, not UTC', () => {
    // 11pm local. toISOString() would roll this to the next day in any
    // negative-offset zone; toKey must stay on the 19th.
    expect(toKey(new Date(2026, 7, 19, 23, 30))).toBe('2026-08-19')
  })

  it('handles just-after-midnight local time', () => {
    expect(toKey(new Date(2026, 7, 19, 0, 15))).toBe('2026-08-19')
  })
})

describe('todayKey', () => {
  it('accepts an injected now', () => {
    expect(todayKey(new Date(2026, 11, 31, 18, 0))).toBe('2026-12-31')
  })
})

describe('fromKey', () => {
  it('returns local midnight', () => {
    const d = fromKey('2026-08-19')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(19)
    expect(d.getHours()).toBe(0)
  })

  it('round-trips with toKey', () => {
    expect(toKey(fromKey('2026-03-08'))).toBe('2026-03-08')
  })
})

describe('addDays', () => {
  it('moves forward and back', () => {
    expect(addDays('2026-08-19', 1)).toBe('2026-08-20')
    expect(addDays('2026-08-19', -1)).toBe('2026-08-18')
  })

  it('rolls over month boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31')
  })

  it('rolls over year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('handles leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('survives a DST spring-forward boundary', () => {
    // US DST 2026 starts Mar 8. Adding 24h of milliseconds would land on
    // Mar 8 23:00 and still read as the 8th; the Date constructor gets it right.
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
  })
})

describe('lastNDays', () => {
  it('returns newest first, inclusive of the end key', () => {
    expect(lastNDays(3, '2026-08-19')).toEqual(['2026-08-19', '2026-08-18', '2026-08-17'])
  })

  it('returns an empty list for n = 0', () => {
    expect(lastNDays(0, '2026-08-19')).toEqual([])
  })
})

describe('dayOfWeek', () => {
  it('reports Sunday as 0', () => {
    expect(dayOfWeek('2026-08-16')).toBe(0)
    expect(dayOfWeek('2026-08-19')).toBe(3)
  })
})

describe('labelParts', () => {
  it('splits a key into weekday and month-day', () => {
    expect(labelParts('2026-08-19')).toEqual({ weekday: 'Wed', monthDay: 'Aug 19' })
  })
})
