import { useEffect, useRef, useState } from 'react'
import { labelParts } from '../lib/dates.js'

/**
 * Marks a day as deliberately off, with an optional note.
 *
 * Same native <dialog> approach as the habit sheet — focus trapping, Escape,
 * and ::backdrop for free.
 */
export default function DayOffSheet({ target, daysOff, onSave, onClear, onClose }) {
  const ref = useRef(null)
  const open = Boolean(target)

  const [dayKey, setDayKey] = useState('')
  const [note, setNote] = useState('')

  const openedKey = target?.dayKey
  useEffect(() => {
    if (!target) return
    setDayKey(target.dayKey)
    setNote(daysOff?.[target.dayKey]?.note ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedKey, open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  if (!target) return null

  // Looked up from the DRAFT date, not the date the sheet opened with. When the
  // picker moves to another day, "Take it back" has to follow it — otherwise it
  // would offer to clear, and then clear, the wrong day.
  const existing = daysOff?.[dayKey] ?? null

  const { weekday, monthDay } = labelParts(dayKey || target.dayKey)

  function submit(event) {
    event.preventDefault()
    onSave(dayKey, note)
  }

  return (
    <dialog className="sheet" ref={ref} onClose={onClose} onCancel={onClose}>
      <form className="sheet-body" onSubmit={submit}>
        <header className="sheet-head">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
          <h2>Not today!</h2>
        </header>

        <p className="sheet-lede">
          Nothing will be due on this day, and it won&rsquo;t count against anything.
        </p>

        {target.pickDate ? (
          <label className="field">
            <span>Which day</span>
            {/*
              <input type="date"> speaks exactly our key format — YYYY-MM-DD,
              interpreted as a local calendar date with no timezone conversion.
              So the value goes straight into the store with no parsing.
            */}
            <input
              type="date"
              value={dayKey}
              onChange={(e) => {
                setDayKey(e.target.value)
                // Pull in whatever note that day already had, so re-picking a
                // day you already flagged shows its note rather than a blank.
                setNote(daysOff?.[e.target.value]?.note ?? '')
              }}
              required
            />
          </label>
        ) : (
          <p className="sheet-day">
            {weekday}, {monthDay}
          </p>
        )}

        <label className="field">
          <span>Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Sam&rsquo;s visiting from out of town"
            autoComplete="off"
          />
        </label>

        <footer className="sheet-foot">
          {existing && (
            <button type="button" className="btn-danger" onClick={() => onClear(dayKey)}>
              Take it back
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={!dayKey}>
            {existing ? 'Save' : 'Mark day off'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
