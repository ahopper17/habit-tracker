import { formatMinutes } from '../lib/plan.js'

// Hand-rolled rather than pulled from a chart library: it is one circle element
// per slice, which is less code than configuring Recharts would be, ships no
// extra bytes, and stays fully themeable.
//
// The trick is stroke-dasharray. Each slice is a full circle whose stroke is
// dashed into exactly one visible run — `dash` long, then a gap for the rest of
// the circumference — and dashoffset rotates that run to where the slice starts.
// No arc-path math, no trigonometry.

const SIZE = 120 // viewBox units; the real size comes from CSS
const STROKE = 16
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function DonutChart({ plan }) {
  // Each slice needs to know where the ones before it ended, so the running
  // total is computed up front rather than mutated during the render below.
  const arcs = []
  let offset = 0
  for (const slice of plan.slices) {
    const dash = slice.fraction * CIRCUMFERENCE
    arcs.push({ ...slice, dash, offset })
    offset += dash
  }

  return (
    <div className="donut">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel(plan)}>
        {/* The empty track doubles as the "unallocated time" slice, so free
            time never needs its own arc — whatever the habits don't cover
            simply stays visible underneath. */}
        <circle
          className="donut-track"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
        />

        {/* Rotated so slice one starts at 12 o'clock instead of 3 o'clock. */}
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {arcs.map((arc) => (
            <circle
              key={arc.id}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={arc.hex}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={-arc.offset}
              // Solid once done, ghosted while still owed — so the ring reads
              // as today's progress, not just today's plan.
              strokeOpacity={arc.done ? 1 : 0.3}
            >
              <title>{`${arc.name} — ${formatMinutes(arc.minutes)}${arc.done ? ' (done)' : ''}`}</title>
            </circle>
          ))}
        </g>
      </svg>

      <div className="donut-center" data-empty={plan.dueCount === 0 || undefined}>
        {plan.dueCount === 0 ? (
          <>
            <strong>Nothing due</strong>
            <span>enjoy the day</span>
          </>
        ) : (
          <>
            <strong>{formatMinutes(plan.totalMinutes)}</strong>
            <span>
              {plan.doneCount === plan.dueCount
                ? 'all done'
                : `${formatMinutes(plan.remainingMinutes)} left`}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/** Screen readers get the numbers, since the ring itself conveys nothing. */
function ariaLabel(plan) {
  if (plan.dueCount === 0) return 'No habits due today'
  const share = Math.round((plan.totalMinutes / plan.wakingMinutes) * 100)
  return `${formatMinutes(plan.totalMinutes)} of habits today, ${share}% of a ${formatMinutes(
    plan.wakingMinutes,
  )} day. ${plan.doneCount} of ${plan.dueCount} done.`
}
