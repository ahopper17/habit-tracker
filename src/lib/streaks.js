import { addDays } from './dates.js'

// Streaks are DERIVED, never stored. The only persisted truth is which days
// were checked off; anything computed from that (streaks, totals) is a pure
// function of it. That means there is no cached counter to drift out of sync
// when you retro-tick a day or delete one.

/**
 * Length of the streak running up to today.
 *
 * If today isn't done yet we count from yesterday instead, so a streak doesn't
 * appear to collapse to 0 every morning before you've had a chance to check in.
 * Only when yesterday is also missing is the streak actually broken.
 *
 * @param {Object<string, boolean>} days - { "YYYY-MM-DD": true }
 * @param {string} todayK
 */
export function currentStreak(days, todayK) {
  if (!days) return 0

  let cursor = days[todayK] ? todayK : addDays(todayK, -1)
  let count = 0
  while (days[cursor]) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

/** Longest run of consecutive days ever recorded for this habit. */
export function longestStreak(days) {
  if (!days) return 0
  const keys = Object.keys(days).filter((k) => days[k]).sort()
  if (keys.length === 0) return 0

  let best = 1
  let run = 1
  for (let i = 1; i < keys.length; i++) {
    // Sorted lexically === sorted chronologically, because the key format is
    // fixed-width and big-endian. Consecutive means "prev + 1 day".
    run = addDays(keys[i - 1], 1) === keys[i] ? run + 1 : 1
    if (run > best) best = run
  }
  return best
}

/** Total number of days ever checked off. */
export function totalDays(days) {
  if (!days) return 0
  return Object.values(days).filter(Boolean).length
}
