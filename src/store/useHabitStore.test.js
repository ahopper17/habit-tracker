import { describe, it, expect } from 'vitest'
import { reducer, loadState, STORAGE_KEY, VERSION } from './useHabitStore.js'

const base = { version: VERSION, habits: [], completions: {} }
const add = (state, id, name) =>
  reducer(state, { type: 'habit/add', id, name, createdAt: '2026-08-19T12:00:00.000Z' })

describe('habit/add', () => {
  it('appends a habit', () => {
    const s = add(base, 'a', 'Read')
    expect(s.habits).toEqual([{ id: 'a', name: 'Read', createdAt: '2026-08-19T12:00:00.000Z' }])
  })

  it('trims the name and rejects blank ones', () => {
    expect(add(base, 'a', '  Read  ').habits[0].name).toBe('Read')
    expect(add(base, 'a', '   ')).toBe(base)
  })
})

describe('habit/rename', () => {
  it('renames only the target habit', () => {
    let s = add(add(base, 'a', 'Read'), 'b', 'Walk')
    s = reducer(s, { type: 'habit/rename', id: 'b', name: 'Run' })
    expect(s.habits.map((h) => h.name)).toEqual(['Read', 'Run'])
  })

  it('ignores a blank rename', () => {
    const s = add(base, 'a', 'Read')
    expect(reducer(s, { type: 'habit/rename', id: 'a', name: ' ' })).toBe(s)
  })
})

describe('habit/remove', () => {
  it('removes the habit and its completions', () => {
    let s = add(add(base, 'a', 'Read'), 'b', 'Walk')
    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-19' })
    s = reducer(s, { type: 'day/toggle', habitId: 'b', dayKey: '2026-08-19' })
    s = reducer(s, { type: 'habit/remove', id: 'a' })
    expect(s.habits.map((h) => h.id)).toEqual(['b'])
    expect(s.completions).toEqual({ b: { '2026-08-19': true } })
  })
})

describe('habit/move', () => {
  const three = () => add(add(add(base, 'a', 'A'), 'b', 'B'), 'c', 'C')

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
})

describe('day/toggle', () => {
  it('turns a day on, then deletes the key when turned back off', () => {
    let s = add(base, 'a', 'Read')
    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-19' })
    expect(s.completions.a).toEqual({ '2026-08-19': true })

    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-19' })
    expect(s.completions.a).toEqual({})
    expect('2026-08-19' in s.completions.a).toBe(false)
  })

  it('keeps other days and habits untouched', () => {
    let s = add(add(base, 'a', 'Read'), 'b', 'Walk')
    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-18' })
    s = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-19' })
    s = reducer(s, { type: 'day/toggle', habitId: 'b', dayKey: '2026-08-19' })
    expect(s.completions).toEqual({
      a: { '2026-08-18': true, '2026-08-19': true },
      b: { '2026-08-19': true },
    })
  })

  it('does not mutate the previous state', () => {
    const s = add(base, 'a', 'Read')
    const next = reducer(s, { type: 'day/toggle', habitId: 'a', dayKey: '2026-08-19' })
    expect(s.completions).toEqual({})
    expect(next).not.toBe(s)
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

  it('reads a valid blob back', () => {
    const saved = { version: 1, habits: [{ id: 'a', name: 'Read', createdAt: 'x' }], completions: { a: { '2026-08-19': true } } }
    expect(loadState(fakeStorage({ [STORAGE_KEY]: JSON.stringify(saved) }))).toEqual(saved)
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
