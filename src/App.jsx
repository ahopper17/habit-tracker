import { useState } from 'react'
import { useHabitStore, DEFAULT_DURATION } from './store/useHabitStore.js'
import { todayKey, labelParts } from './lib/dates.js'
import { EVERY_DAY } from './lib/schedule.js'
import TodayView from './components/TodayView.jsx'
import HistoryView from './components/HistoryView.jsx'
import HabitSheet from './components/HabitSheet.jsx'
import TabBar from './components/TabBar.jsx'
import './App.css'

const NEW_HABIT = 'new'

export default function App() {
  const { habits, completions, settings, addHabit, updateHabit, removeHabit, toggleDay, setWakingHours } =
    useHabitStore()

  const [tab, setTab] = useState('today')
  // `null` closed, 'new' for a blank sheet, otherwise the id being edited.
  const [editingId, setEditingId] = useState(null)

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
          onToggle={toggleDay}
          onEdit={setEditingId}
          onSetWakingHours={setWakingHours}
        />
      ) : (
        <HistoryView
          habits={habits}
          completions={completions}
          today={today}
          onToggle={toggleDay}
        />
      )}

      <HabitSheet
        habit={sheetHabit}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setEditingId(null)}
      />

      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}
