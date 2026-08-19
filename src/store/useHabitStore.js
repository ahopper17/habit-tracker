import { useCallback, useEffect, useReducer, useRef } from 'react'

export const STORAGE_KEY = 'habit-tracker'
export const VERSION = 1

const EMPTY = { version: VERSION, habits: [], completions: {} }

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
 * Bring an older blob up to the current shape. There is only one version so
 * far, but the hook exists now so that v2 has an obvious place to live and
 * old installs never need a manual reset.
 */
function migrate(state) {
  return { ...state, version: VERSION }
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

/**
 * Every state change goes through here, so the persist effect below only has
 * to watch one value. Reducers must stay pure: no Date.now(), no randomUUID —
 * ids and timestamps arrive on the action, which also keeps this testable.
 */
export function reducer(state, action) {
  switch (action.type) {
    case 'habit/add': {
      const name = action.name.trim()
      if (!name) return state
      return {
        ...state,
        habits: [...state.habits, { id: action.id, name, createdAt: action.createdAt }],
      }
    }

    case 'habit/rename': {
      const name = action.name.trim()
      if (!name) return state
      return {
        ...state,
        habits: state.habits.map((h) => (h.id === action.id ? { ...h, name } : h)),
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

  const addHabit = useCallback((name) => {
    // toISOString is right here and only here: createdAt is an *instant*, not a
    // day key. The no-toISOString rule applies to day keys, which must be local.
    dispatch({ type: 'habit/add', id: newId(), name, createdAt: new Date().toISOString() })
  }, [])

  const renameHabit = useCallback((id, name) => {
    dispatch({ type: 'habit/rename', id, name })
  }, [])

  const removeHabit = useCallback((id) => {
    dispatch({ type: 'habit/remove', id })
  }, [])

  const moveHabit = useCallback((id, delta) => {
    dispatch({ type: 'habit/move', id, delta })
  }, [])

  const toggleDay = useCallback((habitId, dayKey) => {
    dispatch({ type: 'day/toggle', habitId, dayKey })
  }, [])

  return {
    habits: state.habits,
    completions: state.completions,
    addHabit,
    renameHabit,
    removeHabit,
    moveHabit,
    toggleDay,
  }
}
