import { useHabitStore } from './store/useHabitStore.js'
import { todayKey } from './lib/dates.js'
import './App.css'

export default function App() {
  const { habits, completions, addHabit, toggleDay } = useHabitStore()
  const today = todayKey()

  function onSubmit(event) {
    event.preventDefault()
    const input = event.currentTarget.elements.name
    addHabit(input.value)
    input.value = ''
  }

  return (
    <main className="app">
      <h1>Habits</h1>

      <form onSubmit={onSubmit}>
        <input name="name" placeholder="New habit" autoComplete="off" />
        <button type="submit">Add</button>
      </form>

      <ul className="scratch-list">
        {habits.map((habit) => (
          <li key={habit.id}>
            <button onClick={() => toggleDay(habit.id, today)}>
              {completions[habit.id]?.[today] ? '✓' : '○'} {habit.name}
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
