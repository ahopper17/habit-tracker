import { describe, it, expect } from 'vitest'
import { currentStreak, longestStreak, totalDays } from './streaks.js'

const TODAY = '2026-08-19'
const days = (...keys) => Object.fromEntries(keys.map((k) => [k, true]))

describe('currentStreak', () => {
  it('is 0 with no data at all', () => {
    expect(currentStreak(undefined, TODAY)).toBe(0)
    expect(currentStreak({}, TODAY)).toBe(0)
  })

  it('counts today plus the run behind it', () => {
    expect(currentStreak(days('2026-08-19', '2026-08-18', '2026-08-17'), TODAY)).toBe(3)
  })

  it('keeps yesterday-anchored streaks alive when today is not done yet', () => {
    expect(currentStreak(days('2026-08-18', '2026-08-17'), TODAY)).toBe(2)
  })

  it('is 0 when neither today nor yesterday is done', () => {
    expect(currentStreak(days('2026-08-17', '2026-08-16'), TODAY)).toBe(0)
  })

  it('is 1 for today alone', () => {
    expect(currentStreak(days(TODAY), TODAY)).toBe(1)
  })

  it('is 1 for yesterday alone', () => {
    expect(currentStreak(days('2026-08-18'), TODAY)).toBe(1)
  })

  it('stops at the first gap', () => {
    expect(currentStreak(days('2026-08-19', '2026-08-18', '2026-08-16'), TODAY)).toBe(2)
  })

  it('ignores future days', () => {
    expect(currentStreak(days('2026-08-20', '2026-08-19'), TODAY)).toBe(1)
  })

  it('treats an explicit false as not done', () => {
    expect(currentStreak({ '2026-08-19': false, '2026-08-18': true }, TODAY)).toBe(1)
  })

  it('crosses a month boundary', () => {
    expect(currentStreak(days('2026-08-02', '2026-08-01', '2026-07-31'), '2026-08-02')).toBe(3)
  })
})

describe('longestStreak', () => {
  it('is 0 with no data', () => {
    expect(longestStreak(undefined)).toBe(0)
    expect(longestStreak({})).toBe(0)
  })

  it('finds the best run, not the latest one', () => {
    const d = days('2026-08-01', '2026-08-02', '2026-08-03', '2026-08-10', '2026-08-11')
    expect(longestStreak(d)).toBe(3)
  })

  it('is 1 for a single scattered day', () => {
    expect(longestStreak(days('2026-08-01', '2026-08-05'))).toBe(1)
  })

  it('spans a year boundary', () => {
    expect(longestStreak(days('2026-12-31', '2027-01-01', '2027-01-02'))).toBe(3)
  })

  it('ignores falsey entries', () => {
    expect(longestStreak({ '2026-08-01': true, '2026-08-02': false, '2026-08-03': true })).toBe(1)
  })
})

describe('totalDays', () => {
  it('counts only truthy days', () => {
    expect(totalDays({ '2026-08-01': true, '2026-08-02': false, '2026-08-03': true })).toBe(2)
    expect(totalDays(undefined)).toBe(0)
  })
})
