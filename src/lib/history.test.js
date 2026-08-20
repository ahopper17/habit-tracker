import { describe, it, expect } from 'vitest'
import { buildHistory, cellState, createdDayKey } from './history.js'
import { EVERY_DAY } from './schedule.js'
import { lastNDays } from './dates.js'

// Aug 2026: 16 Sun, 17 Mon, 18 Tue, 19 Wed, 20 Thu, 21 Fri, 22 Sat
const TODAY = '2026-08-19'
const MWF = [1, 3, 5]

const habit = (id, schedule = EVERY_DAY, createdAt = '2026-01-01T00:00:00.000Z') => ({
  id,
  name: id,
  schedule,
  createdAt,
  durationMinutes: 20,
  color: 'sage',
})

describe('createdDayKey', () => {
  it('converts the created instant to a local day', () => {
    expect(createdDayKey(habit('a', EVERY_DAY, '2026-08-19T12:00:00.000Z'))).toMatch(/^2026-08-\d\d$/)
  })

  it('falls back when createdAt is missing or unparseable', () => {
    expect(createdDayKey({ id: 'a' })).toBe('0000-01-01')
    expect(createdDayKey({ id: 'a', createdAt: 'nonsense' })).toBe('0000-01-01')
  })
})

describe('cellState', () => {
  const completions = { a: { '2026-08-19': true, '2026-08-18': true } }

  it('is done for a scheduled day that was completed', () => {
    expect(cellState(habit('a'), '2026-08-19', completions)).toBe('done')
  })

  it('is open for a scheduled day that was not', () => {
    expect(cellState(habit('a'), '2026-08-17', completions)).toBe('open')
  })

  it('is off for an unscheduled day', () => {
    // Tuesday the 18th, for a Mon/Wed/Fri habit, with no completion.
    expect(cellState(habit('a', MWF), '2026-08-18', {})).toBe('off')
  })

  it('is bonus for an unscheduled day that was completed anyway', () => {
    expect(cellState(habit('a', MWF), '2026-08-18', completions)).toBe('bonus')
  })

  it('is before for days that predate the habit', () => {
    const h = habit('a', EVERY_DAY, '2026-08-18T12:00:00.000Z')
    expect(cellState(h, '2026-08-10', {})).toBe('before')
    expect(cellState(h, '2026-08-19', {})).toBe('open')
  })
})

describe('buildHistory', () => {
  it('returns rows newest first, flagging today', () => {
    const { rows } = buildHistory([habit('a')], {}, lastNDays(3, TODAY), TODAY)
    expect(rows.map((r) => r.key)).toEqual(['2026-08-19', '2026-08-18', '2026-08-17'])
    expect(rows[0].isToday).toBe(true)
    expect(rows[1].isToday).toBe(false)
  })

  it('labels each row', () => {
    const { rows } = buildHistory([habit('a')], {}, [TODAY], TODAY)
    expect(rows[0]).toMatchObject({ weekday: 'Wed', monthDay: 'Aug 19' })
  })

  it('keeps one cell per habit, in column order', () => {
    const { rows } = buildHistory([habit('a'), habit('b')], {}, [TODAY], TODAY)
    expect(rows[0].cells.map((c) => c.habitId)).toEqual(['a', 'b'])
  })

  it('tallies done out of scheduled days', () => {
    const completions = { a: { '2026-08-19': true, '2026-08-17': true } }
    const { tallies } = buildHistory([habit('a')], completions, lastNDays(3, TODAY), TODAY)
    expect(tallies.a).toEqual({ done: 2, scheduled: 3 })
  })

  it('counts only scheduled days in the denominator', () => {
    // Seven days back from Wed 19: Mon 17 and Fri 14 and Wed 19 are scheduled.
    const completions = { a: { '2026-08-19': true } }
    const { tallies } = buildHistory([habit('a', MWF)], completions, lastNDays(7, TODAY), TODAY)
    expect(tallies.a).toEqual({ done: 1, scheduled: 3 })
  })

  it('does not blame a habit for days before it existed', () => {
    const h = habit('a', EVERY_DAY, '2026-08-18T12:00:00.000Z')
    const { tallies } = buildHistory([h], {}, lastNDays(30, TODAY), TODAY)
    expect(tallies.a.scheduled).toBe(2) // the 18th and the 19th
  })

  it('excludes bonus days from both halves of the tally', () => {
    // Ticked Tuesday, which a Mon/Wed/Fri habit never asked for.
    const completions = { a: { '2026-08-18': true } }
    const { rows, tallies } = buildHistory([habit('a', MWF)], completions, lastNDays(3, TODAY), TODAY)
    expect(rows.find((r) => r.key === '2026-08-18').cells[0].state).toBe('bonus')
    expect(tallies.a).toEqual({ done: 0, scheduled: 2 })
  })

  it('handles no habits', () => {
    const { rows, tallies } = buildHistory([], {}, lastNDays(2, TODAY), TODAY)
    expect(rows).toHaveLength(2)
    expect(rows[0].cells).toEqual([])
    expect(tallies).toEqual({})
  })
})
