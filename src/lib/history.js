import { toKey, labelParts } from './dates.js'
import { isDue } from './schedule.js'

// The grid's data, computed as a pure function so the component only draws.
//
// Every cell is one of six states rather than a boolean, because "not ticked"
// covers several genuinely different situations and the grid should not show
// them all as the same empty box:
//
//   done   — scheduled, and you did it
//   open   — scheduled, not done
//   bonus  — nothing was owed, but you did it anyway
//   off    — nothing was owed and nothing was done (a rest day, quiet dash)
//   before — earlier than the day the habit was created
//   future — hasn't happened yet; shown only for days flagged in advance

/** The local day a habit was created. createdAt is an instant, so convert it. */
export function createdDayKey(habit) {
  // Missing createdAt would make every day "before" and blank the column, so
  // fall back to the beginning of time instead.
  if (!habit?.createdAt) return '0000-01-01'
  const date = new Date(habit.createdAt)
  return Number.isNaN(date.getTime()) ? '0000-01-01' : toKey(date)
}

/**
 * @param {object} ctx
 * @param {string} ctx.createdKey
 * @param {boolean} ctx.isDayOff - the whole day was deliberately taken off
 * @param {string} ctx.todayK
 */
export function cellState(habit, dayKey, completions, ctx = {}) {
  const { createdKey = createdDayKey(habit), isDayOff = false, todayK } = ctx

  // Fixed-width keys compare correctly as strings.
  if (dayKey < createdKey) return 'before'
  if (todayK && dayKey > todayK) return 'future'

  const done = Boolean(completions?.[habit.id]?.[dayKey])

  // A day off makes the day un-owed for EVERY habit — which is exactly what an
  // unscheduled day already means, so it reuses those two states rather than
  // inventing more. Anything done on a day off counts as a bonus, and the whole
  // row drops out of the tallies below. The row's own styling and note carry
  // the "this was deliberate" signal.
  if (isDayOff) return done ? 'bonus' : 'off'

  if (isDue(habit, dayKey)) return done ? 'done' : 'open'
  return done ? 'bonus' : 'off'
}

/**
 * Rows for the grid plus a per-habit tally.
 *
 * The tally counts only days the habit was actually committed to and that
 * existed yet: a Mon/Wed/Fri habit is never scored out of 30, a habit added on
 * Tuesday is not retroactively blamed for the whole month, and a day you took
 * off never becomes a day you failed. Bonus days are excluded from both halves
 * — otherwise you could finish "32 of 30".
 *
 * @param {Array} habits
 * @param {Object} completions
 * @param {string[]} dayKeys - newest first
 * @param {string} todayK
 * @param {Object} daysOff - { "YYYY-MM-DD": { note } }
 */
export function buildHistory(habits, completions, dayKeys, todayK, daysOff = {}) {
  const createdKeys = new Map(habits.map((h) => [h.id, createdDayKey(h)]))
  const tallies = Object.fromEntries(habits.map((h) => [h.id, { done: 0, scheduled: 0 }]))

  const rows = dayKeys.map((key) => {
    const dayOff = daysOff?.[key]
    return {
      key,
      ...labelParts(key),
      isToday: key === todayK,
      isFuture: key > todayK,
      dayOff: dayOff ? { note: dayOff.note ?? '' } : null,
      cells: habits.map((habit) => {
        const state = cellState(habit, key, completions, {
          createdKey: createdKeys.get(habit.id),
          isDayOff: Boolean(dayOff),
          todayK,
        })
        if (state === 'done') {
          tallies[habit.id].done++
          tallies[habit.id].scheduled++
        } else if (state === 'open') {
          tallies[habit.id].scheduled++
        }
        return { habitId: habit.id, state }
      }),
    }
  })

  return { rows, tallies }
}

/** Day-off keys after today, soonest last so they read as a countdown above today. */
export function upcomingDaysOff(daysOff, todayK) {
  return Object.keys(daysOff ?? {})
    .filter((key) => key > todayK)
    .sort()
    .reverse()
}
