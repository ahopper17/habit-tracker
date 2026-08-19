import { describe, it, expect } from 'vitest'
import { currentStreak, longestStreak, totalDays } from './streaks.js'
import { EVERY_DAY, WEEKDAYS_ONLY } from './schedule.js'

// Calendar anchors used below (2026):
//   Aug 16 Sun, 17 Mon, 18 Tue, 19 Wed, 20 Thu, 21 Fri, 22 Sat
const TODAY = '2026-08-19' // Wednesday
const MWF = [1, 3, 5]
const days = (...keys) => Object.fromEntries(keys.map((k) => [k, true]))

describe('currentStreak, daily habits', () => {
  it('is 0 with no data at all', () => {
    expect(currentStreak(undefined, TODAY, EVERY_DAY)).toBe(0)
    expect(currentStreak({}, TODAY, EVERY_DAY)).toBe(0)
  })

  it('counts today plus the run behind it', () => {
    expect(currentStreak(days('2026-08-19', '2026-08-18', '2026-08-17'), TODAY, EVERY_DAY)).toBe(3)
  })

  it('keeps yesterday-anchored streaks alive when today is not done yet', () => {
    expect(currentStreak(days('2026-08-18', '2026-08-17'), TODAY, EVERY_DAY)).toBe(2)
  })

  it('is 0 when neither today nor yesterday is done', () => {
    expect(currentStreak(days('2026-08-17', '2026-08-16'), TODAY, EVERY_DAY)).toBe(0)
  })

  it('stops at the first gap', () => {
    expect(currentStreak(days('2026-08-19', '2026-08-18', '2026-08-16'), TODAY, EVERY_DAY)).toBe(2)
  })

  it('ignores future days', () => {
    expect(currentStreak(days('2026-08-20', '2026-08-19'), TODAY, EVERY_DAY)).toBe(1)
  })

  it('crosses a month boundary', () => {
    expect(currentStreak(days('2026-08-02', '2026-08-01', '2026-07-31'), '2026-08-02', EVERY_DAY)).toBe(3)
  })
})

describe('currentStreak, recurring habits', () => {
  it('does not break on days the habit was never due', () => {
    // Mon/Wed/Fri kept perfectly. Tue and Thu are missing but were never owed.
    const kept = days('2026-08-19', '2026-08-17', '2026-08-14', '2026-08-12', '2026-08-10')
    expect(currentStreak(kept, TODAY, MWF)).toBe(5)
  })

  it('breaks when a scheduled day is missed', () => {
    // Missed Monday the 17th.
    expect(currentStreak(days('2026-08-19', '2026-08-14'), TODAY, MWF)).toBe(1)
  })

  it('gives grace on a scheduled today that is not done yet', () => {
    expect(currentStreak(days('2026-08-17', '2026-08-14'), TODAY, MWF)).toBe(2)
  })

  it('does not consume grace when today is not a scheduled day', () => {
    // Thursday, for a Mon/Wed/Fri habit: Wednesday still counts.
    expect(currentStreak(days('2026-08-19', '2026-08-17'), '2026-08-20', MWF)).toBe(2)
  })

  it('spans a weekend for a weekdays-only habit', () => {
    // Mon 17, Fri 14, Thu 13 kept; Sat 15 and Sun 16 were never owed.
    const kept = days('2026-08-17', '2026-08-14', '2026-08-13')
    expect(currentStreak(kept, '2026-08-17', WEEKDAYS_ONLY)).toBe(3)
  })

  it('ignores bonus days on unscheduled dates', () => {
    // Ticked Tuesday too, but Monday was missed — the streak is still just today.
    expect(currentStreak(days('2026-08-19', '2026-08-18'), TODAY, MWF)).toBe(1)
  })

  it('is 0 for a habit scheduled on no days, and terminates', () => {
    expect(currentStreak(days('2026-08-19'), TODAY, [])).toBe(0)
    expect(currentStreak(days('2026-08-19'), TODAY, undefined)).toBe(0)
  })
})

describe('longestStreak', () => {
  it('is 0 with no data', () => {
    expect(longestStreak(undefined, EVERY_DAY)).toBe(0)
    expect(longestStreak({}, EVERY_DAY)).toBe(0)
  })

  it('finds the best run, not the latest one', () => {
    const d = days('2026-08-01', '2026-08-02', '2026-08-03', '2026-08-10', '2026-08-11')
    expect(longestStreak(d, EVERY_DAY)).toBe(3)
  })

  it('spans a year boundary', () => {
    expect(longestStreak(days('2026-12-31', '2027-01-01', '2027-01-02'), EVERY_DAY)).toBe(3)
  })

  it('counts consecutive scheduled days, skipping unscheduled ones', () => {
    // Fri 14, Mon 17, Wed 19 for a Mon/Wed/Fri habit: an unbroken run of 3.
    expect(longestStreak(days('2026-08-14', '2026-08-17', '2026-08-19'), MWF)).toBe(3)
  })

  it('breaks when a scheduled day in between was missed', () => {
    // Fri 14 then Wed 19, with Monday the 17th skipped.
    expect(longestStreak(days('2026-08-14', '2026-08-19'), MWF)).toBe(1)
  })

  it('ignores completions on unscheduled days', () => {
    expect(longestStreak(days('2026-08-18', '2026-08-20'), MWF)).toBe(0)
  })
})

describe('totalDays', () => {
  it('counts every checked day, bonus days included', () => {
    expect(totalDays({ '2026-08-01': true, '2026-08-02': false, '2026-08-03': true })).toBe(2)
    expect(totalDays(undefined)).toBe(0)
  })
})
