import { habitsDueOn } from './schedule.js'
import { colorHex } from './palette.js'

// The donut's data is computed here, as a pure function, so the chart component
// only has to draw. That keeps the arc math free of business rules, and lets
// every rule below (the denominator, the overbooked case, rounding) be tested
// without rendering anything.

/** "2h 15m" / "45m" / "2h" — omits the zero part rather than saying "2h 0m". */
export function formatMinutes(total) {
  const mins = Math.max(0, Math.round(total))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

/**
 * Everything the Today view needs for a given day.
 *
 * Slices are a fraction of the WAKING DAY, not of total habit time, so the
 * chart answers "how much of my day do these take" — 2h of habits reads as a
 * small wedge against a big remainder, which is the honest picture.
 *
 * @param {Array} habits
 * @param {Object} completions - { habitId: { "YYYY-MM-DD": true } }
 * @param {string} dayKey
 * @param {number} wakingHours
 */
export function buildDayPlan(habits, completions, dayKey, wakingHours) {
  const due = habitsDueOn(habits ?? [], dayKey)
  const wakingMinutes = Math.max(1, Math.round((wakingHours ?? 16) * 60))

  const slices = due.map((habit) => {
    const minutes = Math.max(0, habit.durationMinutes ?? 0)
    return {
      id: habit.id,
      name: habit.name,
      minutes,
      color: habit.color,
      hex: colorHex(habit.color),
      done: Boolean(completions?.[habit.id]?.[dayKey]),
    }
  })

  const totalMinutes = slices.reduce((sum, s) => sum + s.minutes, 0)
  const doneMinutes = slices.filter((s) => s.done).reduce((sum, s) => sum + s.minutes, 0)

  // If you schedule more than your waking day, there is no free time left to
  // draw. Fall back to dividing by the habit total so the ring still fills
  // exactly once instead of overflowing past 100%.
  const overbooked = totalMinutes > wakingMinutes
  const denominator = overbooked ? totalMinutes : wakingMinutes

  const withFractions = slices.map((s) => ({ ...s, fraction: s.minutes / denominator }))
  const unallocatedMinutes = Math.max(0, wakingMinutes - totalMinutes)

  return {
    slices: withFractions,
    unallocated: { minutes: unallocatedMinutes, fraction: unallocatedMinutes / denominator },
    totalMinutes,
    doneMinutes,
    remainingMinutes: Math.max(0, totalMinutes - doneMinutes),
    dueCount: slices.length,
    doneCount: slices.filter((s) => s.done).length,
    wakingMinutes,
    overbooked,
  }
}
