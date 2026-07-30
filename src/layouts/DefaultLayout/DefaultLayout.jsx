import { useState } from 'react'
import { matchPath, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NAV_GROUP_ORDER, getNavItems, routeConfig } from '@/app/routing/routeConfig'
import { useAuth } from '@/features/auth/useAuth'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { hasRequiredRole } from '@/shared/constants/roles'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { PageHeaderProvider } from './PageHeaderContext'
import { usePageHeaderActions } from './usePageActions'
import './DefaultLayout.css'

// 현재 경로와 일치하는 routeConfig 항목의 title을 찾는다 — 화면이 매번 제목을 넘길 필요 없게
function findPageTitle(pathname) {
  const matched = routeConfig.find((route) => matchPath({ path: route.path, end: true }, pathname))
  return matched?.title ?? ''
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function formatTodayLabel() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}.${m}.${d} (${WEEKDAY_LABELS[now.getDay()]})`
}

function ContentHeader({ title }) {
  const actions = usePageHeaderActions() // 화면이 usePageActions()로 등록한 페이지별 버튼

  return (
    <header className="default-layout__content-header">
      <div className="default-layout__title-group">
        <h1 className="default-layout__title">{title}</h1>
        <p className="default-layout__today">{formatTodayLabel()}</p>
      </div>
      <div className="default-layout__header-right">
        {actions}
        {/* 알림 종 — 자리만 준비, 실제 동작은 경보 기능 구현 시 연결 */}
        <button type="button" className="default-layout__bell" aria-label="알림">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}

// PC 사이드바 셸. 남색은 사이드바에만 — 콘텐츠 영역 헤더는 흰 배경 + 페이지 제목/알림/액션 전용
export default function DefaultLayout() {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const title = findPageTitle(location.pathname)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  async function handleLogout() {
    await logout()
    setLogoutConfirmOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <PageHeaderProvider>
      <div className="default-layout">
        <div className="default-layout__sidebar-wrap">
          <nav
            className={`default-layout__sidebar ${sidebarOpen ? '' : 'is-collapsed'}`.trim()}
            aria-label="주요 메뉴"
          >
            {/* 사이드바 상단: 로고만 — 접기 토글은 collapse 시에도 눌러야 하니 sidebar 바깥(sidebar-wrap)에 둔다 */}
            <div className="default-layout__sidebar-top">
              <span className="default-layout__brand">
                <img src="/ArcGuard.png" alt="" className="default-layout__logo" />
                ArcGuard
              </span>
            </div>

            <div className="default-layout__nav">
              {NAV_GROUP_ORDER.map((group) => {
                const items = getNavItems(group).filter((item) => hasRequiredRole(role, item.requiredRole))
                if (items.length === 0) return null

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
            </div>

            {/* 사이드바 하단: 아바타 + 이름/역할 + 로그아웃 */}
            <div className="default-layout__sidebar-footer">
              {user && (
                <>
                  <span className="default-layout__avatar" aria-hidden="true">
                    {user.name?.[0] ?? '?'}
                  </span>
                  <span className="default-layout__user-info">
                    <span className="default-layout__user-name">{user.name}</span>
                    <span className="default-layout__user-role">{USER_ROLE_LABELS[role] ?? role}</span>
                  </span>
                </>
              )}
              <button
                type="button"
                className="default-layout__logout-btn"
                aria-label="로그아웃"
                onClick={() => setLogoutConfirmOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 17l5-5-5-5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </nav>

          {/* sidebar-wrap의 자식이라 collapse 시에도(sidebar width:0) 계속 눌릴 수 있음 */}
          <button
            type="button"
            className="default-layout__sidebar-toggle"
            aria-label="사이드바 접기/펼치기"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            ☰
          </button>
        </div>

        <div className="default-layout__content-column">
          <ContentHeader title={title} />
          <main className="default-layout__content" key={location.pathname}>
            <Outlet />
          </main>
        </div>
      </div>

      <ConfirmModal
        visible={logoutConfirmOpen}
        title="로그아웃"
        message="로그아웃 하시겠습니까?"
        confirmLabel="로그아웃"
        onConfirm={handleLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </PageHeaderProvider>
  )
}
