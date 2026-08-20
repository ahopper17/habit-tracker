import { describe, it, expect } from 'vitest'
import { reducer, loadState, migrate, STORAGE_KEY, VERSION, DEFAULT_DURATION, DEFAULT_WAKING_HOURS } from './useHabitStore.js'
import { EVERY_DAY } from '../lib/schedule.js'

const base = {
  version: VERSION,
  habits: [],
  completions: {},
  daysOff: {},
  settings: { wakingHours: DEFAULT_WAKING_HOURS },
}

const add = (state, id, fields = {}) =>
  reducer(state, {
    type: 'habit/add',
    id,
    createdAt: '2026-08-19T12:00:00.000Z',
    name: id,
    durationMinutes: DEFAULT_DURATION,
    schedule: EVERY_DAY,
    ...fields,
  })

describe('habit/add', () => {
  it('stores duration, schedule, and color', () => {
    const s = add(base, 'a', { name: 'Read', durationMinutes: 30, schedule: [1, 3, 5] })
    expect(s.habits[0]).toMatchObject({
      id: 'a',
      name: 'Read',
      durationMinutes: 30,
      schedule: [1, 3, 5],
    })
    expect(typeof s.habits[0].color).toBe('string')
  })

  it('trims the name and rejects blank ones', () => {
    expect(add(base, 'a', { name: '  Read  ' }).habits[0].name).toBe('Read')
    expect(add(base, 'a', { name: '   ' })).toBe(base)
  })

  it('defaults to a daily schedule', () => {
    expect(add(base, 'a', { schedule: undefined }).habits[0].schedule).toEqual(EVERY_DAY)
  })

  it('normalizes a messy schedule', () => {
    expect(add(base, 'a', { schedule: [5, 1, 1, 9] }).habits[0].schedule).toEqual([1, 5])
  })

  it('clamps nonsense durations', () => {
    expect(add(base, 'a', { durationMinutes: 0 }).habits[0].durationMinutes).toBe(DEFAULT_DURATION)
    expect(add(base, 'a', { durationMinutes: -5 }).habits[0].durationMinutes).toBe(DEFAULT_DURATION)
    expect(add(base, 'a', { durationMinutes: 'abc' }).habits[0].durationMinutes).toBe(DEFAULT_DURATION)
    expect(add(base, 'a', { durationMinutes: 99999 }).habits[0].durationMinutes).toBe(1440)
    expect(add(base, 'a', { durationMinutes: 20.6 }).habits[0].durationMinutes).toBe(21)
  })

  it('gives each new habit a distinct color', () => {
    const s = add(add(add(base, 'a'), 'b'), 'c')
    const colors = s.habits.map((h) => h.color)
    expect(new Set(colors).size).toBe(3)
  })
})

describe('habit/update', () => {
  it('changes only the fields provided', () => {
    const s = add(base, 'a', { name: 'Read', durationMinutes: 30, schedule: [1] })
    const next = reducer(s, { type: 'habit/update', id: 'a', fields: { name: 'Reading' } })
    expect(next.habits[0]).toMatchObject({ name: 'Reading', durationMinutes: 30, schedule: [1] })
  })

  it('updates duration, schedule, and color', () => {
    const s = add(base, 'a')
    const next = reducer(s, {
      type: 'habit/update',
      id: 'a',
      fields: { durationMinutes: 45, schedule: [0, 6], color: 'blush' },
    })
    expect(next.habits[0]).toMatchObject({ durationMinutes: 45, schedule: [0, 6], color: 'blush' })
  })

  it('ignores a blank rename', () => {
    const s = add(base, 'a', { name: 'Read' })
    const next = reducer(s, { type: 'habit/update', id: 'a', fields: { name: '  ' } })
    expect(next.habits[0].name).toBe('Read')
  })

  it('leaves other habits alone', () => {
    const s = add(add(base, 'a', { name: 'A' }), 'b', { name: 'B' })
    const next = reducer(s, { type: 'habit/update', id: 'b', fields: { name: 'Bee' } })
    expect(next.habits.map((h) => h.name)).toEqual(['A', 'Bee'])
  })
})

describe('habit/remove', () => {
  it('removes the habit and its completions', () => {
    let s = add(add(base, 'a'), 'b')
    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-19' })
    s = reducer(s, { type: 'day/toggle', habitId: 'b', dayKey: '2026-08-19' })
    s = reducer(s, { type: 'habit/remove', id: 'a' })
    expect(s.habits.map((h) => h.id)).toEqual(['b'])
    expect(s.completions).toEqual({ b: { '2026-08-19': true } })
  })
})

describe('habit/move', () => {
  const three = () => add(add(add(base, 'a'), 'b'), 'c')

  it('moves a habit up and down', () => {
    expect(reducer(three(), { type: 'habit/move', id: 'c', delta: -1 }).habits.map((h) => h.id))
      .toEqual(['a', 'c', 'b'])
    expect(reducer(three(), { type: 'habit/move', id: 'a', delta: 1 }).habits.map((h) => h.id))
      .toEqual(['b', 'a', 'c'])
  })

  it('is a no-op at the edges', () => {
    const s = three()
    expect(reducer(s, { type: 'habit/move', id: 'a', delta: -1 })).toBe(s)
    expect(reducer(s, { type: 'habit/move', id: 'c', delta: 1 })).toBe(s)
  })

  it('does not reshuffle colors', () => {
    const s = three()
    const byId = Object.fromEntries(s.habits.map((h) => [h.id, h.color]))
    const moved = reducer(s, { type: 'habit/move', id: 'c', delta: -1 })
    moved.habits.forEach((h) => expect(h.color).toBe(byId[h.id]))
  })
})

describe('day/toggle', () => {
  it('turns a day on, then deletes the key when turned back off', () => {
    let s = add(base, 'a')
    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-19' })
    expect(s.completions.a).toEqual({ '2026-08-19': true })

    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-19' })
    expect('2026-08-19' in s.completions.a).toBe(false)
  })

  it('keeps other days and habits untouched', () => {
    let s = add(add(base, 'a'), 'b')
    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-18' })
    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-19' })
    s = reducer(s, { type: 'day/toggle', habitId: 'b', dayKey: '2026-08-19' })
    expect(s.completions).toEqual({
      a: { '2026-08-18': true, '2026-08-19': true },
      b: { '2026-08-19': true },
    })
  })

  it('does not mutate the previous state', () => {
    const s = add(base, 'a')
    const next = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-19' })
    expect(s.completions).toEqual({})
    expect(next).not.toBe(s)
  })
})

describe('dayoff/set and dayoff/clear', () => {
  it('records a day off with a note', () => {
    const s = reducer(base, { type: 'dayoff/set', dayKey: '2026-08-26', note: 'Sam visiting' })
    expect(s.daysOff).toEqual({ '2026-08-26': { note: 'Sam visiting' } })
  })

  it('allows a day off with no note', () => {
    const s = reducer(base, { type: 'dayoff/set', dayKey: '2026-08-26' })
    expect(s.daysOff['2026-08-26']).toEqual({ note: '' })
  })

  it('trims the note', () => {
    const s = reducer(base, { type: 'dayoff/set', dayKey: '2026-08-26', note: '  rest  ' })
    expect(s.daysOff['2026-08-26'].note).toBe('rest')
  })

  it('overwrites an existing note for the same day', () => {
    let s = reducer(base, { type: 'dayoff/set', dayKey: '2026-08-26', note: 'first' })
    s = reducer(s, { type: 'dayoff/set', dayKey: '2026-08-26', note: 'second' })
    expect(s.daysOff['2026-08-26'].note).toBe('second')
  })

  it('clears one day without touching the others', () => {
    let s = reducer(base, { type: 'dayoff/set', dayKey: '2026-08-26', note: 'a' })
    s = reducer(s, { type: 'dayoff/set', dayKey: '2026-08-27', note: 'b' })
    s = reducer(s, { type: 'dayoff/clear', dayKey: '2026-08-26' })
    expect(Object.keys(s.daysOff)).toEqual(['2026-08-27'])
  })

  it('leaves completions alone', () => {
    let s = add(base, 'a')
    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-26' })
    s = reducer(s, { type: 'dayoff/set', dayKey: '2026-08-26', note: 'off' })
    expect(s.completions.a).toEqual({ '2026-08-26': true })
  })
})

describe('settings/update', () => {
  it('changes waking hours', () => {
    expect(reducer(base, { type: 'settings/update', fields: { wakingHours: 14 } }).settings)
      .toEqual({ wakingHours: 14 })
  })
})

describe('migrate', () => {
  it('upgrades a v1 blob without losing data', () => {
    const v1 = {
      version: 1,
      habits: [
        { id: 'a', name: 'Read', createdAt: 'x' },
        { id: 'b', name: 'Walk', createdAt: 'y' },
      ],
      completions: { a: { '2026-08-19': true } },
    }
    const v2 = migrate(v1)

    expect(v2.version).toBe(VERSION)
    expect(v2.completions).toEqual(v1.completions)
    expect(v2.settings).toEqual({ wakingHours: DEFAULT_WAKING_HOURS })
    v2.habits.forEach((h) => {
      expect(h.durationMinutes).toBe(DEFAULT_DURATION)
      expect(h.schedule).toEqual(EVERY_DAY)
      expect(typeof h.color).toBe('string')
    })
    expect(v2.habits[0].color).not.toBe(v2.habits[1].color)
  })

  it('adds daysOff when upgrading a v2 blob', () => {
    const v2 = {
      version: 2,
      habits: [{ id: 'a', name: 'Read', createdAt: 'x', durationMinutes: 45, schedule: [1], color: 'blush' }],
      completions: { a: { '2026-08-19': true } },
      settings: { wakingHours: 12 },
    }
    const v3 = migrate(v2)
    expect(v3.version).toBe(VERSION)
    expect(v3.daysOff).toEqual({})
    expect(v3.completions).toEqual(v2.completions)
    expect(v3.settings).toEqual({ wakingHours: 12 })
    expect(v3.habits).toEqual(v2.habits)
  })

  it('preserves existing days off', () => {
    const v3 = migrate({
      version: 3,
      habits: [],
      completions: {},
      daysOff: { '2026-08-26': { note: 'Sam' } },
      settings: { wakingHours: 16 },
    })
    expect(v3.daysOff).toEqual({ '2026-08-26': { note: 'Sam' } })
  })

  it('leaves an already-migrated blob untouched', () => {
    const v3 = {
      version: 3,
      habits: [{ id: 'a', name: 'Read', createdAt: 'x', durationMinutes: 45, schedule: [1], color: 'blush' }],
      completions: {},
      daysOff: {},
      settings: { wakingHours: 12 },
    }
    expect(migrate(v3)).toEqual(v3)
  })
})

// A hand-rolled stand-in for localStorage — enough surface for loadState,
// and it lets us feed it deliberately broken values.
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    dump: () => Object.fromEntries(map),
  }
}

describe('loadState', () => {
  it('returns an empty tracker when nothing is saved', () => {
    expect(loadState(fakeStorage())).toEqual(base)
  })

  it('migrates a saved v1 blob on read', () => {
    const v1 = JSON.stringify({
      version: 1,
      habits: [{ id: 'a', name: 'Read', createdAt: 'x' }],
      completions: { a: { '2026-08-19': true } },
    })
    const loaded = loadState(fakeStorage({ [STORAGE_KEY]: v1 }))
    expect(loaded.version).toBe(VERSION)
    expect(loaded.habits[0].durationMinutes).toBe(DEFAULT_DURATION)
    expect(loaded.completions).toEqual({ a: { '2026-08-19': true } })
  })

  it('falls back and backs up when the JSON is broken', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '{not json' })
    expect(loadState(storage)).toEqual(base)
    expect(storage.dump()[`${STORAGE_KEY}.corrupt`]).toBe('{not json')
  })

  it('falls back when the shape is wrong', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ habits: 'nope' }) })
    expect(loadState(storage)).toEqual(base)
  })
})
