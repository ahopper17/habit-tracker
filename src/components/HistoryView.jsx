import { useState } from 'react'
import { lastNDays } from '../lib/dates.js'
import { buildHistory } from '../lib/history.js'
import HabitGrid from './HabitGrid.jsx'

const PAGE = 30

export default function HistoryView({ habits, completions, today, onToggle }) {
  // How far back the grid reaches. Kept here rather than in the store because
  // it is view state — how much you happen to be looking at right now is not
  // something that should be saved to localStorage or survive a reload.
  const [dayCount, setDayCount] = useState(PAGE)

  if (habits.length === 0) {
    return <p className="empty">Add a habit and its history will show up here.</p>
  }

  const dayKeys = lastNDays(dayCount, today)
  const { rows, tallies } = buildHistory(habits, completions, dayKeys, today)

  return (
    <>
      <HabitGrid habits={habits} rows={rows} tallies={tallies} onToggle={onToggle} />
      <div className="more">
        <button type="button" className="btn-quiet" onClick={() => setDayCount((n) => n + PAGE)}>
          Show {PAGE} more days
        </button>
      </div>
    </>
  )
}
