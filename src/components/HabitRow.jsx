import { formatMinutes } from '../lib/plan.js'
import { colorHex } from '../lib/palette.js'
import { scheduleLabel } from '../lib/schedule.js'

/**
 * One habit in the Today list. Doubles as the donut's legend — the color dot
 * ties the row to its slice, which is why there is no separate legend block to
 * keep in sync.
 */
export default function HabitRow({ habit, done, dueToday, onToggle, onEdit }) {
  return (
    <li className="row" data-done={done || undefined}>
      <button
        type="button"
        className="row-toggle"
        onClick={onToggle}
        aria-pressed={done}
        // The visible text is split across two spans plus an aria-hidden dot,
        // which leaves the computed name unreliable — so state it outright.
        aria-label={`${habit.name}, ${formatMinutes(habit.durationMinutes)}`}
        style={{ '--dot': colorHex(habit.color) }}
      >
        <span className="dot" aria-hidden="true">
          {done ? '✓' : ''}
        </span>
        <span className="row-text">
          <span className="row-name">{habit.name}</span>
          <span className="row-meta">
            {formatMinutes(habit.durationMinutes)}
            {!dueToday && ` · ${scheduleLabel(habit.schedule)}`}
          </span>
        </span>
      </button>

      <button type="button" className="icon-btn" onClick={onEdit} aria-label={`Edit ${habit.name}`}>
        ⋯
      </button>
    </li>
  )
}
