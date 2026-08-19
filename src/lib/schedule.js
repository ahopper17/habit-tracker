import { dayOfWeek } from './dates.js'

// A schedule is an array of weekday numbers, 0 = Sunday, matching
// Date.getDay(). Storing the weekday set (rather than "every N days") means
// whether a habit is due on a given date is a pure lookup with no anchor date
// and no drift — which is what keeps the streak and grid logic simple.

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]
export const WEEKDAYS_ONLY = [1, 2, 3, 4, 5]

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Is this habit due on this day key? */
export function isDue(habit, dayKey) {
  return Boolean(habit?.schedule?.includes(dayOfWeek(dayKey)))
}

/** The habits due on a given day, in list order. */
export function habitsDueOn(habits, dayKey) {
  return habits.filter((h) => isDue(h, dayKey))
}

/** Normalize a schedule: unique, sorted, valid weekday numbers only. */
export function normalizeSchedule(schedule) {
  return [...new Set(schedule)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort()
}

/** Human-readable summary: "Daily", "Weekdays", "Mon, Wed, Fri". */
export function scheduleLabel(schedule) {
  const days = normalizeSchedule(schedule ?? [])
  if (days.length === 0) return 'Never'
  if (days.length === 7) return 'Daily'
  if (days.join() === WEEKDAYS_ONLY.join()) return 'Weekdays'
  if (days.join() === '0,6') return 'Weekends'
  return days.map((d) => WEEKDAY_NAMES[d]).join(', ')
}
