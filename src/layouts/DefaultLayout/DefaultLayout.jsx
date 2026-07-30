import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NAV_GROUP_ORDER, getNavItems } from '../../app/routing/routeConfig'
import { useAuth } from '../../features/auth/useAuth'
import ConfirmModal from '../../shared/components/modals/ConfirmModal'
import { hasRequiredRole } from '../../shared/constants/roles'
import { USER_ROLE_LABELS } from '../../shared/constants/domainLabels'
import './DefaultLayout.css'

// PC 사이드바+헤더 셸. 위험 팝업/미확인 알림 모달 자리는 모니터링 기능 구현 시 연결
export default function DefaultLayout() {
  const { user, role, clearUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  // 로그아웃 확정 → 로컬 세션 정리 후 로그인 이동 (API 연동은 이후 Phase)
  function handleLogout() {
    clearUser()
    setLogoutConfirmOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <div className="default-layout">
      {/* 헤더: 사이드바 토글 + 로고 + 사용자 정보 + 로그아웃 */}
      <header className="default-layout__header">
        <button
          type="button"
          className="default-layout__menu-toggle"
          aria-label="사이드바 접기/펼치기"
          onClick={() => setSidebarOpen((open) => !open)}
        >
          ☰
        </button>
        <span className="default-layout__brand">ArcGuard</span>
        <div className="default-layout__spacer" />
        {user && (
          <span className="u-text-secondary">
            {user.name} · {USER_ROLE_LABELS[role] ?? role}
          </span>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => setLogoutConfirmOpen(true)}>
          로그아웃
        </button>
      </header>

      <div className="default-layout__body">
        {/* 사이드바: navGroup별 메뉴, 권한 미달 항목 자동 제외 */}
        <nav
          className={`default-layout__sidebar ${sidebarOpen ? '' : 'is-collapsed'}`.trim()}
          aria-label="주요 메뉴"
        >
          {NAV_GROUP_ORDER.map((group) => {
            const items = getNavItems(group).filter((item) => hasRequiredRole(role, item.requiredRole)) // 권한 미달 항목 제외
            if (items.length === 0) return null // 표시할 항목 없으면 그룹째로 숨김

            return (
              <div key={group} className="default-layout__nav-group">
                <p className="default-layout__nav-group-title">{group}</p>
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `default-layout__nav-link ${isActive ? 'is-active' : ''}`.trim()
                    }
                  >
                    {item.title}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* 실제 화면 영역, key=경로 → 라우트 이동 시 강제 리마운트 */}
        <main className="default-layout__content" key={location.pathname}>
          <Outlet />
        </main>
      </div>

      <ConfirmModal
        visible={logoutConfirmOpen}
        title="로그아웃"
        message="로그아웃 하시겠습니까?"
        confirmLabel="로그아웃"
        onConfirm={handleLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  )
}
