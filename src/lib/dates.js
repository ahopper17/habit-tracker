// All date handling is LOCAL-time. We never use toISOString(), because that
// converts to UTC first: at 9pm in a UTC-5 zone it would report tomorrow's
// date, and a habit checked off tonight would land on the wrong row.

/** Format a Date as a local "YYYY-MM-DD" key. */
export function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Today's key. Takes an optional Date so tests can pin "now". */
export function todayKey(now = new Date()) {
  return toKey(now)
}

/**
 * Parse a "YYYY-MM-DD" key into a Date at LOCAL midnight.
 * new Date("2026-08-19") would parse as UTC midnight — hence the manual split.
 */
export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Shift a key by n days (negative goes back).
 * Doing the math through the Date constructor lets it handle month/year
 * rollovers and DST for us — day 32 of a month is day 1 of the next.
 */
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  return toKey(new Date(y, m - 1, d + n))
}

/** n day-keys ending at `endKey`, newest first: [today, yesterday, ...]. */
export function lastNDays(n, endKey) {
  const keys = []
  for (let i = 0; i < n; i++) keys.push(addDays(endKey, -i))
  return keys
}

/** Day of the week, 0 = Sunday — used to shade weekends in the grid. */
export function dayOfWeek(key) {
  return fromKey(key).getDay()
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Wed" / "Aug 19" pieces for a row label. */
export function labelParts(key) {
  const date = fromKey(key)
  return {
    weekday: WEEKDAYS[date.getDay()],
    monthDay: `${MONTHS[date.getMonth()]} ${date.getDate()}`,
  }
}
