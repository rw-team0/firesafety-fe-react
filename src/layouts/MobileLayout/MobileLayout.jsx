import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getMobileNavItems } from '@/app/routing/routeConfig'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { buildSiteSelectPath } from '@/features/sites/utils/siteEntry'
import { canManageSites } from '@/features/sites/utils/sitePolicy'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import './MobileLayout.css'

// 모바일 하단 탭 셸. PC/모바일 구분은 URL 프리픽스(/m/*)로만
export default function MobileLayout() {
  const { user, role, logout } = useAuth()
  const { currentSite, sites } = useSite()
  const navigate = useNavigate()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const navItems = getMobileNavItems()
  const siteChangeable = sites.length > 1 || canManageSites(role)

  // 로그아웃 확정 → 실제 로그아웃 API 호출 후 모바일 로그인 이동
  async function handleLogout() {
    await logout()
    setLogoutConfirmOpen(false)
    navigate('/m/login', { replace: true })
  }

  return (
    <div className="mobile-layout">
      {/* 헤더: 로고 + 사용자 정보 + 로그아웃 */}
      <header className="mobile-layout__header">
        <span className="mobile-layout__brand">
          <img src="/ArcGuard.png" alt="" className="mobile-layout__logo" />
          ArcGuard
        </span>
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

      {/* 현재 현장 표시 — 좁은 화면이라 헤더와 같은 줄에 넣지 않고 별도 바로 분리 */}
      {currentSite && (
        <div className="mobile-layout__site">
          <span className="mobile-layout__site-name">{currentSite.name}</span>
          {siteChangeable && (
            <button
              type="button"
              className="mobile-layout__site-change"
              onClick={() => navigate(buildSiteSelectPath(true))}
            >
              변경
            </button>
          )}
        </div>
      )}

      <main className="mobile-layout__content">
        <Outlet />
      </main>

      {/* 하단 탭: mobile navGroup 항목만 */}
      <nav className="mobile-layout__tabbar" aria-label="하단 메뉴">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `mobile-layout__tab ${isActive ? 'is-active' : ''}`.trim()}
          >
            {item.title}
          </NavLink>
        ))}
      </nav>

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
