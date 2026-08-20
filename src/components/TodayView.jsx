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
  onToggle,
  onEdit,
  onSetWakingHours,
}) {
  const plan = buildDayPlan(habits, completions, today, settings.wakingHours)
  const dueToday = habits.filter((h) => isDue(h, today))
  const notDueToday = habits.filter((h) => !isDue(h, today))

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
