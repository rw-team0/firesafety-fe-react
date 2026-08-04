import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getMobileNavItems } from '@/app/routing/routeConfig'
import { useAuth } from '@/features/auth/useAuth'
import { useMonitoring } from '@/features/monitoring/useMonitoring'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import MobileDrawer from './MobileDrawer'
import { MOBILE_NAV_ICONS } from './mobileNavIcons'
import './MobileLayout.css'

// 더보기 탭 — 드로어(전체 메뉴) 오픈 트리거, 라우트가 없어 mobileNavIcons.jsx에 안 둠
function MoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

// 모바일 하단 탭 셸. PC/모바일 구분은 URL 프리픽스(/m/*)로만
// 사용자 정보/현장/로그아웃은 헤더가 아니라 삼선 → 드로어(MobileDrawer)로 이동
export default function MobileLayout() {
  const { logout } = useAuth()
  const { unreadAlertCount } = useMonitoring()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const navItems = getMobileNavItems()

  // 로그아웃 확정 → 실제 로그아웃 API 호출 후 모바일 로그인 이동
  async function handleLogout() {
    await logout()
    setLogoutConfirmOpen(false)
    navigate('/m/login', { replace: true })
  }

  return (
    <div className="mobile-layout">
      {/* 헤더: 로고 + 알림(자리 표시자) + 삼선(전체 메뉴) */}
      <header className="mobile-layout__header">
        <span className="mobile-layout__brand">
          <img src="/ArcGuard.png" alt="" className="mobile-layout__logo" />
          ArcGuard
        </span>
        <button
          type="button"
          className="mobile-layout__icon-btn"
          aria-label="알림"
          onClick={() => navigate(ROUTE_PATHS.mobileAlerts)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {unreadAlertCount > 0 && <span className="mobile-layout__icon-badge">{unreadAlertCount}</span>}
        </button>
        <button
          type="button"
          className="mobile-layout__icon-btn"
          aria-label="전체 메뉴"
          onClick={() => setDrawerOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <main className="mobile-layout__content">
        <Outlet />
      </main>

      {/* 하단 탭: mobile navGroup 항목 + 맨 끝 "더보기"(라우트 아님, 드로어 오픈) */}
      <nav className="mobile-layout__tabbar" aria-label="하단 메뉴">
        {navItems.map((item) => {
          const Icon = MOBILE_NAV_ICONS[item.path]
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `mobile-layout__tab ${isActive ? 'is-active' : ''}`.trim()}
            >
              {Icon && <Icon />}
              <span>{item.title}</span>
            </NavLink>
          )
        })}
        <button
          type="button"
          className={`mobile-layout__tab mobile-layout__tab--button ${drawerOpen ? 'is-active' : ''}`.trim()}
          onClick={() => setDrawerOpen(true)}
        >
          <MoreIcon />
          <span>더보기</span>
        </button>
      </nav>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogoutClick={() => {
          setDrawerOpen(false)
          setLogoutConfirmOpen(true)
        }}
      />

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
