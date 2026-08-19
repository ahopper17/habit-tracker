import { useEffect, useRef, useState } from 'react'
import { HABIT_COLORS } from '../lib/palette.js'
import { WEEKDAY_LABELS, EVERY_DAY, WEEKDAYS_ONLY, scheduleLabel } from '../lib/schedule.js'
import { DEFAULT_DURATION } from '../store/useHabitStore.js'

const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60]

/**
 * Add/edit sheet, built on the native <dialog> element.
 *
 * Using <dialog> with showModal() rather than a hand-rolled overlay means the
 * browser gives us focus trapping, Escape-to-close, inertness of the content
 * behind, and the ::backdrop pseudo-element for free — all the things a modal
 * usually needs a library to get right.
 */
export default function HabitSheet({ habit, onSave, onDelete, onClose }) {
  const ref = useRef(null)
  const open = Boolean(habit)

  // Draft state, so edits are only committed on Save and Cancel truly cancels.
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [schedule, setSchedule] = useState(EVERY_DAY)

  const isNew = habit?.id === undefined

  // Reset the draft only when a DIFFERENT habit is opened — the dependency is
  // habit.id, not habit. Picking a color saves immediately, which hands back a
  // new habit object; depending on the object would re-run this and wipe a
  // half-typed name every time you tapped a swatch.
  const openedId = habit?.id
  useEffect(() => {
    if (!habit) return
    setName(habit.name ?? '')
    setDuration(habit.durationMinutes ?? DEFAULT_DURATION)
    setSchedule(habit.schedule ?? EVERY_DAY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedId, open])

  // <dialog> is imperative, so opening is an effect rather than a prop.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  if (!habit) return null

  function toggleDay(day) {
    setSchedule((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    )
  }

  function submit(event) {
    event.preventDefault()
    if (!name.trim() || schedule.length === 0) return
    onSave({ name, durationMinutes: Number(duration), schedule })
  }

  return (
    <dialog className="sheet" ref={ref} onClose={onClose} onCancel={onClose}>
      <form className="sheet-body" onSubmit={submit}>
        <header className="sheet-head">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
          <h2>{isNew ? 'New habit' : 'Edit habit'}</h2>
        </header>

        <label className="field">
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Read, stretch, journal…"
            autoComplete="off"
            /* eslint-disable-next-line jsx-a11y/no-autofocus */
            autoFocus={isNew}
          />
        </label>

        <fieldset className="field">
          <legend>Duration</legend>
          <div className="chips">
            {DURATION_PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                className="chip"
                aria-pressed={Number(duration) === mins}
                onClick={() => setDuration(mins)}
              >
                {mins}m
              </button>
            ))}
          </div>
          <div className="custom-duration">
            <input
              type="number"
              min="1"
              max="1440"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              aria-label="Duration in minutes"
            />
            <span>minutes</span>
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Repeat</legend>
          <div className="weekdays">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                className="weekday"
                aria-pressed={schedule.includes(day)}
                // The label repeats (two T's, two S's), so the accessible name
                // has to come from the full day name, not the visible letter.
                aria-label={FULL_DAYS[day]}
                onClick={() => toggleDay(day)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="schedule-row">
            <span className="schedule-summary">{scheduleLabel(schedule)}</span>
            <span className="presets">
              <button type="button" className="link" onClick={() => setSchedule(EVERY_DAY)}>
                Daily
              </button>
              <button type="button" className="link" onClick={() => setSchedule(WEEKDAYS_ONLY)}>
                Weekdays
              </button>
            </span>
          </div>
        </fieldset>

        {!isNew && (
          <fieldset className="field">
            <legend>Color</legend>
            <div className="swatches">
              {HABIT_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className="swatch"
                  style={{ '--swatch': color.hex }}
                  aria-pressed={habit.color === color.id}
                  aria-label={color.label}
                  onClick={() => onSave({ color: color.id }, { keepOpen: true })}
                />
              ))}
            </div>
          </fieldset>
        )}

        <footer className="sheet-foot">
          {!isNew && (
            <button type="button" className="btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={!name.trim() || !schedule.length}>
            {isNew ? 'Add habit' : 'Save'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
