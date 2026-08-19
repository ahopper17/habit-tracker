import { describe, it, expect } from 'vitest'
import { buildDayPlan, formatMinutes } from './plan.js'
import { EVERY_DAY } from './schedule.js'

const WED = '2026-08-19'
const habit = (id, minutes, schedule = EVERY_DAY) => ({
  id,
  name: id,
  durationMinutes: minutes,
  schedule,
  color: 'sage',
})

describe('formatMinutes', () => {
  it('formats hours and minutes, omitting zero parts', () => {
    expect(formatMinutes(135)).toBe('2h 15m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(0)).toBe('0m')
  })

  it('clamps negatives and rounds', () => {
    expect(formatMinutes(-10)).toBe('0m')
    expect(formatMinutes(59.6)).toBe('1h')
  })
})

describe('buildDayPlan', () => {
  it('includes only habits due that day', () => {
    const habits = [habit('a', 20), habit('b', 30, [1])] // b is Mondays only
    const plan = buildDayPlan(habits, {}, WED, 16)
    expect(plan.slices.map((s) => s.id)).toEqual(['a'])
    expect(plan.dueCount).toBe(1)
  })

  it('sizes slices against the waking day, leaving a remainder', () => {
    const plan = buildDayPlan([habit('a', 48)], {}, WED, 16) // 48 of 960 minutes
    expect(plan.slices[0].fraction).toBeCloseTo(0.05)
    expect(plan.unallocated.minutes).toBe(912)
    expect(plan.unallocated.fraction).toBeCloseTo(0.95)
    expect(plan.overbooked).toBe(false)
  })

  it('totals due, done, and remaining minutes', () => {
    const habits = [habit('a', 20), habit('b', 40)]
    const plan = buildDayPlan(habits, { a: { [WED]: true } }, WED, 16)
    expect(plan.totalMinutes).toBe(60)
    expect(plan.doneMinutes).toBe(20)
    expect(plan.remainingMinutes).toBe(40)
    expect(plan.doneCount).toBe(1)
  })

  it('marks completion per slice', () => {
    const plan = buildDayPlan([habit('a', 20), habit('b', 20)], { a: { [WED]: true } }, WED, 16)
    expect(plan.slices.map((s) => s.done)).toEqual([true, false])
  })

  it('does not count a completion from another day', () => {
    const plan = buildDayPlan([habit('a', 20)], { a: { '2026-08-18': true } }, WED, 16)
    expect(plan.slices[0].done).toBe(false)
  })

  it('renormalizes when habits overflow the waking day', () => {
    // 12h + 6h of habits against a 16h day: no free time left to draw.
    const plan = buildDayPlan([habit('a', 720), habit('b', 360)], {}, WED, 16)
    expect(plan.overbooked).toBe(true)
    expect(plan.unallocated.minutes).toBe(0)
    const sum = plan.slices.reduce((s, x) => s + x.fraction, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('handles an empty day', () => {
    const plan = buildDayPlan([], {}, WED, 16)
    expect(plan.slices).toEqual([])
    expect(plan.totalMinutes).toBe(0)
    expect(plan.unallocated.fraction).toBeCloseTo(1)
  })

  it('resolves a hex for each slice', () => {
    const plan = buildDayPlan([{ ...habit('a', 20), color: 'blush' }], {}, WED, 16)
    expect(plan.slices[0].hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})
