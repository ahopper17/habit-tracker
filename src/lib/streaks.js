import { addDays } from './dates.js'
import { isDue } from './schedule.js'

// Streaks are DERIVED, never stored. The only persisted truth is which days
// were checked off; anything computed from that is a pure function of it, so
// back-filling a missed day just recomputes instead of needing a repair pass.
//
// Everything here walks SCHEDULED days only. For a Mon/Wed/Fri habit, Tuesday
// is not a gap — it was never owed. Walking raw calendar days would reset that
// habit's streak to 0 every single Tuesday.
//
// Completions on unscheduled days (bonus days) are ignored by streaks. They
// still show in the grid and still count toward totals; they just don't extend
// a streak, because a streak measures keeping the commitment you set.

/**
 * Length of the streak of scheduled days running up to today.
 *
 * If today is due but not done yet, counting starts from the previous scheduled
 * day instead — otherwise every streak would read 0 each morning before you had
 * a chance to check in.
 *
 * @param {Object<string, boolean>} days - { "YYYY-MM-DD": true }
 * @param {string} todayK
 * @param {number[]} schedule - weekday numbers, 0 = Sunday
 */
export function currentStreak(days, todayK, schedule) {
  // An empty schedule is never due, so the walk below would never terminate.
  if (!days || !schedule?.length) return 0
  const habit = { schedule }

  let cursor = todayK
  // Grace for today only. If today isn't scheduled, the loop skips it anyway.
  if (isDue(habit, cursor) && !days[cursor]) cursor = addDays(cursor, -1)

  let count = 0
  for (;;) {
    if (isDue(habit, cursor)) {
      if (!days[cursor]) break // a scheduled day that was missed — streak ends
      count++
    }
    cursor = addDays(cursor, -1)
  }
  return count
}

/** Longest run of consecutive scheduled days ever completed. */
export function longestStreak(days, schedule) {
  if (!days || !schedule?.length) return 0
  const habit = { schedule }

  const keys = Object.keys(days)
    .filter((k) => days[k] && isDue(habit, k))
    .sort() // fixed-width big-endian keys sort lexically === chronologically
  if (keys.length === 0) return 0

  let best = 1
  let run = 1
  for (let i = 1; i < keys.length; i++) {
    run = hasMissedDayBetween(keys[i - 1], keys[i], habit) ? 1 : run + 1
    if (run > best) best = run
  }
  return best
}

/**
 * Was any scheduled day skipped strictly between two completed days?
 * This is what makes "consecutive" mean consecutive *scheduled* days: Fri → Mon
 * is unbroken for a weekdays-only habit, because nothing was owed in between.
 */
function hasMissedDayBetween(fromKey, toKey, habit) {
  let cursor = addDays(fromKey, 1)
  while (cursor < toKey) {
    if (isDue(habit, cursor)) return true
    cursor = addDays(cursor, 1)
  }
  return false
}

/** Total number of days ever checked off, bonus days included. */
export function totalDays(days) {
  if (!days) return 0
  return Object.values(days).filter(Boolean).length
}
