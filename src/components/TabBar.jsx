// Inline SVG rather than text glyphs: emoji and box-drawing characters render
// differently per platform, and they were selectable on long-press.
function DonutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="3.5" opacity="0.35" />
      <path d="M12 4a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M4 10h16M4 15h16M11 4v16" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

const TABS = [
  { id: 'today', label: 'Today', Icon: DonutIcon },
  { id: 'history', label: 'History', Icon: GridIcon },
]

/**
 * Bottom tab bar rather than top: on a phone this is where your thumb already
 * is, and it is what a native app would do. It is also plain local state, not
 * routing — which is what keeps us off react-router and away from the GitHub
 * Pages deep-link 404 we talked about.
 */
export default function TabBar({ active, onChange }) {
  return (
    <nav className="tabbar" aria-label="Views">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="tab"
          aria-current={active === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          <span className="tab-icon">
            <tab.Icon />
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
