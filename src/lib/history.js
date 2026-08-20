import { toKey, labelParts } from './dates.js'
import { isDue } from './schedule.js'

// The grid's data, computed as a pure function so the component only draws.
//
// Every cell is one of five states rather than a boolean, because "not ticked"
// covers several genuinely different situations and the grid should not show
// them all as the same empty box:
//
//   done   — scheduled, and you did it
//   open   — scheduled, not done
//   bonus  — not scheduled, but you did it anyway
//   off    — not scheduled, not done (a rest day, drawn as a quiet dash)
//   before — earlier than the day the habit was created

/** The local day a habit was created. createdAt is an instant, so convert it. */
export function createdDayKey(habit) {
  // Missing createdAt would make every day "before" and blank the column, so
  // fall back to the beginning of time instead.
  if (!habit?.createdAt) return '0000-01-01'
  const date = new Date(habit.createdAt)
  return Number.isNaN(date.getTime()) ? '0000-01-01' : toKey(date)
}

export function cellState(habit, dayKey, completions, createdKey = createdDayKey(habit)) {
  // Fixed-width keys compare correctly as strings.
  if (dayKey < createdKey) return 'before'
  const done = Boolean(completions?.[habit.id]?.[dayKey])
  if (isDue(habit, dayKey)) return done ? 'done' : 'open'
  return done ? 'bonus' : 'off'
}

/**
 * Rows for the grid plus a per-habit tally.
 *
 * The tally counts only days the habit was actually committed to and that
 * existed yet: a Mon/Wed/Fri habit is never scored out of 30, and a habit added
 * on Tuesday is not retroactively blamed for the whole month. Bonus days are
 * excluded from both halves — otherwise you could finish "32 of 30".
 *
 * @param {Array} habits
 * @param {Object} completions
 * @param {string[]} dayKeys - newest first
 * @param {string} todayK
 */
export function buildHistory(habits, completions, dayKeys, todayK) {
  const createdKeys = new Map(habits.map((h) => [h.id, createdDayKey(h)]))
  const tallies = Object.fromEntries(habits.map((h) => [h.id, { done: 0, scheduled: 0 }]))

  const rows = dayKeys.map((key) => ({
    key,
    ...labelParts(key),
    isToday: key === todayK,
    cells: habits.map((habit) => {
      const state = cellState(habit, key, completions, createdKeys.get(habit.id))
      if (state === 'done') {
        tallies[habit.id].done++
        tallies[habit.id].scheduled++
      } else if (state === 'open') {
        tallies[habit.id].scheduled++
      }
      return { habitId: habit.id, state }
    }),
  }))

  return { rows, tallies }
}
