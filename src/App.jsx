import { useMemo, useState } from 'react'
import { useHabitStore, DEFAULT_DURATION } from './store/useHabitStore.js'
import { todayKey, labelParts } from './lib/dates.js'
import { buildDayPlan, formatMinutes } from './lib/plan.js'
import { isDue, EVERY_DAY } from './lib/schedule.js'
import DonutChart from './components/DonutChart.jsx'
import HabitRow from './components/HabitRow.jsx'
import HabitSheet from './components/HabitSheet.jsx'
import './App.css'

const NEW_HABIT = 'new'
const WAKING_OPTIONS = [12, 14, 16, 18]

export default function App() {
  const { habits, completions, settings, addHabit, updateHabit, removeHabit, toggleDay, setWakingHours } =
    useHabitStore()

  // `null` closed, 'new' for a blank sheet, otherwise the id being edited.
  const [editingId, setEditingId] = useState(null)

  const today = todayKey()
  const { weekday, monthDay } = labelParts(today)

  // Derived on every render rather than stored: cheap for a handful of habits,
  // and it can never fall out of sync with the completions it is computed from.
  const plan = useMemo(
    () => buildDayPlan(habits, completions, today, settings.wakingHours),
    [habits, completions, today, settings.wakingHours],
  )

  const dueToday = habits.filter((h) => isDue(h, today))
  const notDueToday = habits.filter((h) => !isDue(h, today))

  // Read the habit being edited straight from the store so the sheet reflects
  // saves immediately (picking a color updates its own selected state).
  const sheetHabit =
    editingId === NEW_HABIT
      ? { name: '', durationMinutes: DEFAULT_DURATION, schedule: EVERY_DAY }
      : (habits.find((h) => h.id === editingId) ?? null)

  function handleSave(fields, opts) {
    if (editingId === NEW_HABIT) addHabit(fields)
    else updateHabit(editingId, fields)
    if (!opts?.keepOpen) setEditingId(null)
  }

  function handleDelete() {
    removeHabit(editingId)
    setEditingId(null)
  }

  return (
    <div className="app">
      <header className="app-head">
        <div>
          <h1>Today</h1>
          <p className="date">
            {weekday}, {monthDay}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditingId(NEW_HABIT)}>
          + Habit
        </button>
      </header>

      <section className="card chart-card">
        <DonutChart plan={plan} />
        <div className="chart-summary">
          {plan.dueCount > 0 ? (
            <p className="share">
              <strong>{Math.round((plan.totalMinutes / plan.wakingMinutes) * 100)}%</strong> of your
              day, {plan.doneCount} of {plan.dueCount} done
            </p>
          ) : (
            <p className="share">No habits scheduled for today.</p>
          )}

          <label className="waking">
            <span>Waking day</span>
            <select
              value={settings.wakingHours}
              onChange={(e) => setWakingHours(Number(e.target.value))}
            >
              {WAKING_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h} hours
                </option>
              ))}
            </select>
          </label>

          {plan.overbooked && (
            <p className="warn">
              That is {formatMinutes(plan.totalMinutes)} of habits in a{' '}
              {formatMinutes(plan.wakingMinutes)} day.
            </p>
          )}
        </div>
      </section>

      {habits.length === 0 ? (
        <p className="empty">No habits yet — add one to get started.</p>
      ) : (
        <>
          <ul className="rows">
            {dueToday.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                dueToday
                done={Boolean(completions[habit.id]?.[today])}
                onToggle={() => toggleDay(habit.id, today)}
                onEdit={() => setEditingId(habit.id)}
              />
            ))}
          </ul>

          {notDueToday.length > 0 && (
            <>
              <h2 className="section-head">Not due today</h2>
              <ul className="rows muted-rows">
                {notDueToday.map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    dueToday={false}
                    done={Boolean(completions[habit.id]?.[today])}
                    onToggle={() => toggleDay(habit.id, today)}
                    onEdit={() => setEditingId(habit.id)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <HabitSheet
        habit={sheetHabit}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setEditingId(null)}
      />
    </div>
  )
}
