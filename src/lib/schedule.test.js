import { describe, it, expect } from 'vitest'
import { isDue, habitsDueOn, normalizeSchedule, scheduleLabel, EVERY_DAY, WEEKDAYS_ONLY } from './schedule.js'

// 2026-08-19 is a Wednesday; 2026-08-16 is a Sunday.
const MWF = [1, 3, 5]

describe('isDue', () => {
  it('matches the weekday of the key', () => {
    expect(isDue({ schedule: MWF }, '2026-08-19')).toBe(true) // Wed
    expect(isDue({ schedule: MWF }, '2026-08-20')).toBe(false) // Thu
  })

  it('is false for an empty or missing schedule', () => {
    expect(isDue({ schedule: [] }, '2026-08-19')).toBe(false)
    expect(isDue({}, '2026-08-19')).toBe(false)
    expect(isDue(undefined, '2026-08-19')).toBe(false)
  })

  it('treats Sunday as 0', () => {
    expect(isDue({ schedule: [0] }, '2026-08-16')).toBe(true)
  })
})

describe('habitsDueOn', () => {
  it('filters and preserves order', () => {
    const habits = [
      { id: 'a', schedule: EVERY_DAY },
      { id: 'b', schedule: [0] },
      { id: 'c', schedule: MWF },
    ]
    expect(habitsDueOn(habits, '2026-08-19').map((h) => h.id)).toEqual(['a', 'c'])
  })
})

describe('normalizeSchedule', () => {
  it('dedupes, sorts, and drops invalid days', () => {
    expect(normalizeSchedule([5, 1, 1, 3])).toEqual([1, 3, 5])
    expect(normalizeSchedule([7, -1, 2.5, 2])).toEqual([2])
  })
})

describe('scheduleLabel', () => {
  it('names the common shapes', () => {
    expect(scheduleLabel(EVERY_DAY)).toBe('Daily')
    expect(scheduleLabel(WEEKDAYS_ONLY)).toBe('Weekdays')
    expect(scheduleLabel([0, 6])).toBe('Weekends')
    expect(scheduleLabel([])).toBe('Never')
  })

  it('lists arbitrary sets', () => {
    expect(scheduleLabel(MWF)).toBe('Mon, Wed, Fri')
  })
})
