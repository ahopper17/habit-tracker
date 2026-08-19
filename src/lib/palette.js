// Habit colors live here as data, not as hardcoded hex in components.
//
// A habit stores its color *id* ("sage"), never the hex value. Two reasons:
// nudging a shade later updates every existing habit instead of stranding old
// ones on the old value, and an id survives a future light/dark theme where the
// same "sage" needs two different hexes.
//
// Deliberately capped at six. A donut stops being readable past six slices, and
// six is also about where two colors start looking like the same color.
export const HABIT_COLORS = [
  { id: 'sage', label: 'Sage', hex: '#8FAE8B' },
  { id: 'blush', label: 'Blush', hex: '#E3A0AB' },
  { id: 'clay', label: 'Clay', hex: '#D9A188' },
  { id: 'sand', label: 'Sand', hex: '#DFC393' },
  { id: 'sky', label: 'Sky', hex: '#9DBACF' },
  { id: 'lilac', label: 'Lilac', hex: '#BCA8CA' },
]

export const DEFAULT_COLOR = HABIT_COLORS[0].id

/** Resolve a stored color id to a hex value, falling back if the id is unknown. */
export function colorHex(id) {
  return (HABIT_COLORS.find((c) => c.id === id) ?? HABIT_COLORS[0]).hex
}

/**
 * Pick the color for a new habit: the first one not already in use, so adding
 * habits one at a time gives you six distinguishable slices before repeating.
 */
export function nextColor(usedIds) {
  const used = new Set(usedIds)
  return (HABIT_COLORS.find((c) => !used.has(c.id)) ?? HABIT_COLORS[0]).id
}
