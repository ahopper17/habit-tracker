import { useEffect, useMemo, useReducer, useRef } from 'react'
import { EVERY_DAY, normalizeSchedule } from '../lib/schedule.js'
import { HABIT_COLORS, nextColor } from '../lib/palette.js'

export const STORAGE_KEY = 'habit-tracker'
export const VERSION = 3

export const DEFAULT_DURATION = 20
export const DEFAULT_WAKING_HOURS = 16

const EMPTY = {
  version: VERSION,
  habits: [],
  completions: {},
  // Days deliberately taken off, with an optional note: { "2026-08-26": { note } }.
  //
  // Deliberately its own top-level key rather than something inside
  // `completions`. A day off is a THIRD state — not a completion and not a
  // miss — and folding it into the completions map would force it to pretend
  // to be one of the other two.
  daysOff: {},
  settings: { wakingHours: DEFAULT_WAKING_HOURS },
}

/**
 * Read the saved blob. Anything unreadable falls back to an empty tracker
 * rather than throwing — a corrupt localStorage value should not brick the app.
 * The bad value is copied aside first so it is still recoverable by hand.
 */
export function loadState(storage = globalThis.localStorage) {
  let raw = null
  try {
    raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return EMPTY

    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.habits) || typeof parsed.completions !== 'object') {
      throw new Error('unexpected shape')
    }
    return migrate(parsed)
  } catch (err) {
    console.warn('[habit-tracker] could not read saved data, starting fresh', err)
    try {
      if (raw) storage?.setItem(`${STORAGE_KEY}.corrupt`, raw)
    } catch {
      // Storage may be full or blocked; losing the backup is acceptable.
    }
    return EMPTY
  }
}

/**
 * Bring an older blob up to the current shape.
 *
 * v1 habits were {id, name, createdAt}. v2 adds duration, schedule, and color.
 * v3 adds daysOff. Filling defaults here rather than guarding for undefined at
 * every read site means the rest of the app only ever sees one shape — and
 * nobody has to clear localStorage to pick up the new fields.
 *
 * Note this is additive at every step, so it is safe to run on data of any
 * version, including data already current.
 */
export function migrate(state) {
  const habits = state.habits.map((habit, i) => ({
    ...habit,
    durationMinutes: habit.durationMinutes ?? DEFAULT_DURATION,
    schedule: normalizeSchedule(habit.schedule ?? EVERY_DAY),
    // Assigned by position only for habits that predate colors; from here on
    // the color is chosen at creation and never shifts when the list reorders.
    color: habit.color ?? HABIT_COLORS[i % HABIT_COLORS.length].id,
  }))

  return {
    ...state,
    version: VERSION,
    habits,
    daysOff: state.daysOff ?? {},
    settings: { wakingHours: state.settings?.wakingHours ?? DEFAULT_WAKING_HOURS },
  }
}

function save(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    // Private-mode Safari and quota errors land here. Nothing useful to do
    // beyond keeping the in-memory session working.
    console.warn('[habit-tracker] could not save', err)
  }
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `h_${Date.now().toString(36)}`
}

/** Clamp a duration to something a day can actually hold. */
function cleanDuration(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DURATION
  return Math.min(n, 24 * 60)
}

/**
 * Every state change goes through here, so the persist effect below only has
 * to watch one value. Reducers must stay pure: no Date.now(), no randomUUID —
 * ids and timestamps arrive on the action, which also keeps this testable.
 */
export function reducer(state, action) {
  switch (action.type) {
    case 'habit/add': {
      const name = action.name?.trim()
      if (!name) return state
      return {
        ...state,
        habits: [
          ...state.habits,
          {
            id: action.id,
            name,
            createdAt: action.createdAt,
            durationMinutes: cleanDuration(action.durationMinutes),
            schedule: normalizeSchedule(action.schedule ?? EVERY_DAY),
            color: action.color ?? nextColor(state.habits.map((h) => h.color)),
          },
        ],
      }
    }

    case 'habit/update': {
      // Only the keys present in `fields` change, so the setup sheet can save a
      // rename without having to resend duration, schedule, and color.
      const { fields } = action
      return {
        ...state,
        habits: state.habits.map((h) => {
          if (h.id !== action.id) return h
          const next = { ...h }
          if (fields.name !== undefined) {
            const name = fields.name.trim()
            if (name) next.name = name
          }
          if (fields.durationMinutes !== undefined) {
            next.durationMinutes = cleanDuration(fields.durationMinutes)
          }
          if (fields.schedule !== undefined) {
            next.schedule = normalizeSchedule(fields.schedule)
          }
          if (fields.color !== undefined) next.color = fields.color
          return next
        }),
      }
    }

    case 'habit/remove': {
      // Drop the habit's completions too, otherwise deleted habits leave
      // orphaned day maps that grow the blob forever.
      const { [action.id]: _removed, ...completions } = state.completions
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.id),
        completions,
      }
    }

    case 'habit/move': {
      const from = state.habits.findIndex((h) => h.id === action.id)
      const to = from + action.delta
      if (from < 0 || to < 0 || to >= state.habits.length) return state
      const habits = [...state.habits]
      const [moved] = habits.splice(from, 1)
      habits.splice(to, 0, moved)
      return { ...state, habits }
    }

    case 'day/toggle': {
      const days = state.completions[action.habitId] ?? {}
      let next
      if (days[action.dayKey]) {
        // Un-checking deletes the key rather than storing `false`, so a day is
        // either present-and-true or absent. One shape to reason about.
        const { [action.dayKey]: _off, ...rest } = days
        next = rest
      } else {
        next = { ...days, [action.dayKey]: true }
      }
      return { ...state, completions: { ...state.completions, [action.habitId]: next } }
    }

    case 'dayoff/set':
      return {
        ...state,
        daysOff: { ...state.daysOff, [action.dayKey]: { note: (action.note ?? '').trim() } },
      }

    case 'dayoff/clear': {
      const { [action.dayKey]: _cleared, ...daysOff } = state.daysOff
      return { ...state, daysOff }
    }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.fields } }

    default:
      return state
  }
}

/**
 * The single source of app state. Held in one useReducer so that persistence
 * is one effect watching one object, instead of a save call scattered into
 * every handler that could ever forget one.
 */
export function useHabitStore() {
  const [state, dispatch] = useReducer(reducer, null, () => loadState())

  // Skip the write triggered by the initial render: it would just echo back
  // what we read a moment ago, and if the read failed it would overwrite the
  // (already backed-up) original with an empty tracker.
  const hydrated = useRef(false)
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    save(state)
  }, [state])

  const actions = useMemo(
    () => ({
      addHabit: ({ name, durationMinutes, schedule, color }) =>
        dispatch({
          type: 'habit/add',
          id: newId(),
          // toISOString is right here and only here: createdAt is an *instant*,
          // not a day key. The no-toISOString rule applies to day keys.
          createdAt: new Date().toISOString(),
          name,
          durationMinutes,
          schedule,
          color,
        }),
      updateHabit: (id, fields) => dispatch({ type: 'habit/update', id, fields }),
      removeHabit: (id) => dispatch({ type: 'habit/remove', id }),
      moveHabit: (id, delta) => dispatch({ type: 'habit/move', id, delta }),
      toggleDay: (habitId, dayKey) => dispatch({ type: 'day/toggle', habitId, dayKey }),
      setDayOff: (dayKey, note) => dispatch({ type: 'dayoff/set', dayKey, note }),
      clearDayOff: (dayKey) => dispatch({ type: 'dayoff/clear', dayKey }),
      setWakingHours: (wakingHours) =>
        dispatch({ type: 'settings/update', fields: { wakingHours } }),
    }),
    [],
  )

  return {
    habits: state.habits,
    completions: state.completions,
    daysOff: state.daysOff,
    settings: state.settings,
    ...actions,
  }
}
