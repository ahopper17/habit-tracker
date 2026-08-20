import { useState } from 'react'
import { useHabitStore, DEFAULT_DURATION } from './store/useHabitStore.js'
import { todayKey, labelParts, addDays } from './lib/dates.js'
import { EVERY_DAY } from './lib/schedule.js'
import TodayView from './components/TodayView.jsx'
import HistoryView from './components/HistoryView.jsx'
import HabitSheet from './components/HabitSheet.jsx'
import DayOffSheet from './components/DayOffSheet.jsx'
import TabBar from './components/TabBar.jsx'
import './App.css'

const NEW_HABIT = 'new'

export default function App() {
  const {
    habits,
    completions,
    daysOff,
    settings,
    addHabit,
    updateHabit,
    removeHabit,
    toggleDay,
    setWakingHours,
    setDayOff,
    clearDayOff,
  } = useHabitStore()

  const [tab, setTab] = useState('today')
  // `null` closed, 'new' for a blank sheet, otherwise the id being edited.
  const [editingId, setEditingId] = useState(null)
  // `null` closed, else { dayKey, pickDate } for the day-off sheet.
  const [dayOffTarget, setDayOffTarget] = useState(null)

  const today = todayKey()
  const { weekday, monthDay } = labelParts(today)

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

  function handleSaveDayOff(dayKey, note) {
    setDayOff(dayKey, note)
    setDayOffTarget(null)
  }

  function handleClearDayOff(dayKey) {
    clearDayOff(dayKey)
    setDayOffTarget(null)
  }

  return (
    <div className="app">
      <header className="app-head">
        <div>
          <h1>{tab === 'today' ? 'Today' : 'History'}</h1>
          <p className="date">
            {tab === 'today' ? `${weekday}, ${monthDay}` : 'Tap any day to change it'}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditingId(NEW_HABIT)}>
          + Habit
        </button>
      </header>

      {tab === 'today' ? (
        <TodayView
          habits={habits}
          completions={completions}
          settings={settings}
          today={today}
          dayOff={daysOff[today] ?? null}
          onToggle={toggleDay}
          onEdit={setEditingId}
          onSetWakingHours={setWakingHours}
          onMarkDayOff={() => setDayOffTarget({ dayKey: today, pickDate: false })}
        />
      ) : (
        <HistoryView
          habits={habits}
          completions={completions}
          daysOff={daysOff}
          today={today}
          onToggle={toggleDay}
          // "Plan a day off" is for something coming up, so it opens on
          // tomorrow rather than today; any date is still pickable.
          onPickDayOff={() => setDayOffTarget({ dayKey: addDays(today, 1), pickDate: true })}
          onEditDayOff={(dayKey) => setDayOffTarget({ dayKey, pickDate: false })}
        />
      )}

      <HabitSheet
        habit={sheetHabit}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setEditingId(null)}
      />

      <DayOffSheet
        target={dayOffTarget}
        daysOff={daysOff}
        onSave={handleSaveDayOff}
        onClear={handleClearDayOff}
        onClose={() => setDayOffTarget(null)}
      />

      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}
