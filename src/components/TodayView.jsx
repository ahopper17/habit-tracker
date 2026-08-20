import { buildDayPlan, formatMinutes } from '../lib/plan.js'
import { isDue } from '../lib/schedule.js'
import DonutChart from './DonutChart.jsx'
import HabitRow from './HabitRow.jsx'

const WAKING_OPTIONS = [12, 14, 16, 18]

export default function TodayView({
  habits,
  completions,
  settings,
  today,
  dayOff,
  onToggle,
  onEdit,
  onSetWakingHours,
  onMarkDayOff,
}) {
  const plan = buildDayPlan(habits, completions, today, settings.wakingHours)
  const dueToday = habits.filter((h) => isDue(h, today))
  const notDueToday = habits.filter((h) => !isDue(h, today))

  // On a day off the donut is beside the point — nothing is owed, so showing a
  // time budget and a "0 of 4 done" would be exactly the pressure this feature
  // exists to remove. The card says why the day is off instead.
  if (dayOff) {
    return (
      <>
        <section className="card dayoff-card">
          <h2>Not today!</h2>
          {dayOff.note ? (
            <p className="dayoff-note">{dayOff.note}</p>
          ) : (
            <p className="dayoff-note muted-note">Enjoy it.</p>
          )}
          <button type="button" className="btn-quiet" onClick={onMarkDayOff}>
            Edit or take it back
          </button>
        </section>

        {habits.length > 0 && (
          <>
            <h2 className="section-head">Still here if you want them</h2>
            <ul className="rows muted-rows">
              {habits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  dueToday={false}
                  done={Boolean(completions[habit.id]?.[today])}
                  onToggle={() => onToggle(habit.id, today)}
                  onEdit={() => onEdit(habit.id)}
                />
              ))}
            </ul>
          </>
        )}
      </>
    )
  }

  return (
    <>
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
              onChange={(e) => onSetWakingHours(Number(e.target.value))}
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

      <div className="more">
        <button type="button" className="btn-quiet" onClick={onMarkDayOff}>
          Not today!
        </button>
      </div>

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
                onToggle={() => onToggle(habit.id, today)}
                onEdit={() => onEdit(habit.id)}
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
                    onToggle={() => onToggle(habit.id, today)}
                    onEdit={() => onEdit(habit.id)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  )
}
