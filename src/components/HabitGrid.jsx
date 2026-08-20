import { colorHex } from '../lib/palette.js'

/**
 * Days as rows (newest on top), habits as columns.
 *
 * It is ONE css grid, not a table and not nested row divs. That matters for the
 * sticky behaviour: the header cells and the date column are children of the
 * same scroll container, so `position: sticky` pins them independently — the
 * header stays while you scroll back through months, the dates stay while you
 * scroll sideways through habits.
 */
export default function HabitGrid({ habits, rows, tallies, onToggle, onPickDay }) {
  return (
    <div className="grid-scroll">
      <div className="grid" style={{ '--habit-count': habits.length }}>
        {/* Corner: sticky in both directions, so it never lets a date slide
            underneath the header. */}
        <div className="grid-corner" />

        {habits.map((habit) => {
          const tally = tallies[habit.id] ?? { done: 0, scheduled: 0 }
          return (
            <div
              className="grid-head"
              key={habit.id}
              style={{ '--dot': colorHex(habit.color) }}
            >
              <span className="head-label">{habit.name}</span>
              <span className="head-tally">
                {tally.scheduled === 0 ? '—' : `${tally.done} of ${tally.scheduled}`}
              </span>
            </div>
          )
        })}

        {rows.map((row) => (
          // Fragment keyed by day: the date cell and its habit cells are
          // siblings in the grid, not wrapped in a row element, because a
          // wrapper would break the column tracks.
          <Row key={row.key} row={row} onToggle={onToggle} onPickDay={onPickDay} habits={habits} />
        ))}
      </div>
    </div>
  )
}

function Row({ row, habits, onToggle, onPickDay }) {
  return (
    <>
      {/* The date cell is the handle for the whole day: tapping it is how a day
          gets marked off, which keeps that action on the row it applies to
          rather than in a separate date-picking flow. */}
      <button
        type="button"
        className="grid-date"
        data-today={row.isToday || undefined}
        data-dayoff={row.dayOff ? '' : undefined}
        data-future={row.isFuture || undefined}
        onClick={() => onPickDay?.(row.key)}
        aria-label={`${row.weekday} ${row.monthDay}${row.dayOff ? `, day off${row.dayOff.note ? `: ${row.dayOff.note}` : ''}` : ''}`}
      >
        <span className="date-weekday">{row.weekday}</span>
        <span className="date-monthday">{row.monthDay}</span>
        {row.dayOff && <span className="date-off" aria-hidden="true">off</span>}
      </button>

      {row.cells.map((cell, i) => {
        const habit = habits[i]
        // Nothing to tick before a habit existed, and ticking tomorrow is not a
        // thing you can truthfully do.
        const interactive = cell.state !== 'before' && cell.state !== 'future'
        return (
          <div
            className="grid-cell"
            key={cell.habitId}
            data-today={row.isToday || undefined}
            data-dayoff={row.dayOff ? '' : undefined}
          >
            {interactive ? (
              <button
                type="button"
                className="cell-btn"
                data-state={cell.state}
                style={{ '--dot': colorHex(habit.color) }}
                onClick={() => onToggle(cell.habitId, row.key)}
                aria-pressed={cell.state === 'done' || cell.state === 'bonus'}
                aria-label={`${habit.name}, ${row.weekday} ${row.monthDay}, ${LABELS[cell.state]}`}
              >
                <span aria-hidden="true">{MARKS[cell.state]}</span>
              </button>
            ) : (
              <span className="cell-empty" aria-hidden="true" />
            )}
          </div>
        )
      })}
    </>
  )
}

const MARKS = { done: '✓', bonus: '✓', open: '', off: '·', before: '', future: '' }
const LABELS = {
  done: 'done',
  bonus: 'done, not scheduled',
  open: 'not done',
  off: 'rest day',
  before: '',
  future: '',
}
