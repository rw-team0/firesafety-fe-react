import { NavLink } from 'react-router-dom'

// 화면 전환용 탭. FilterBar와 같은 카드 안에 두면 "탭+필터" 한 세트로 보인다(탭 없는 화면은 FilterBar만 카드에 남음)
// tabs: [{ label, to, end? }]
export default function TabBar({ tabs }) {
  if (!tabs || tabs.length < 2) return null

  return (
    <nav className="tab-bar" aria-label="화면 전환">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `tab-bar__tab ${isActive ? 'is-active' : ''}`.trim()}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
