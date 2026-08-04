import { NavLink, useNavigate } from 'react-router-dom'
import { getMobileFullMenuItems, getMobileNavItems } from '@/app/routing/routeConfig'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { buildSiteSelectPath } from '@/features/sites/utils/siteEntry'
import { canManageSites } from '@/features/sites/utils/sitePolicy'
import { hasRequiredRole } from '@/shared/constants/roles'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { MOBILE_NAV_ICONS } from './mobileNavIcons'

// 헤더 삼선 → 우측 슬라이드 드로어. 로그아웃/현장 정보는 헤더 대신 여기로 이동
export default function MobileDrawer({ open, onClose, onLogoutClick }) {
  const { user, role } = useAuth()
  const { currentSite, sites } = useSite()
  const navigate = useNavigate()
  const navItems = getMobileNavItems().filter((item) => hasRequiredRole(role, item.requiredRole))
  const fullMenuItems = getMobileFullMenuItems().filter((item) => hasRequiredRole(role, item.requiredRole))
  const siteChangeable = sites.length > 1 || canManageSites(role)

  function handleSiteChange() {
    onClose()
    navigate(buildSiteSelectPath(true))
  }

  function handleNavClick() {
    onClose()
  }

  return (
    <>
      <div
        className={`mobile-drawer__backdrop ${open ? 'is-open' : ''}`.trim()}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`mobile-drawer ${open ? 'is-open' : ''}`.trim()} aria-label="전체 메뉴" aria-hidden={!open}>
        <div className="mobile-drawer__profile">
          {user && (
            <>
              <span className="mobile-drawer__avatar" aria-hidden="true">
                {user.name?.[0] ?? '?'}
              </span>
              <span className="mobile-drawer__profile-info">
                <span className="mobile-drawer__profile-name">{user.name}</span>
                <span className="mobile-drawer__profile-role">{USER_ROLE_LABELS[role] ?? role}</span>
              </span>
            </>
          )}
          <button type="button" className="mobile-drawer__close" aria-label="메뉴 닫기" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {currentSite && (
          <div className="mobile-drawer__site">
            <span className="mobile-drawer__site-label">현장</span>
            <span className="mobile-drawer__site-name" title={currentSite.name}>
              {currentSite.name}
            </span>
            {siteChangeable && (
              <button type="button" className="mobile-drawer__site-change" onClick={handleSiteChange}>
                변경
              </button>
            )}
          </div>
        )}

        <p className="mobile-drawer__section-title">빠른 메뉴</p>
        <div className="mobile-drawer__quick-grid">
          {navItems.map((item) => {
            const Icon = MOBILE_NAV_ICONS[item.path]
            return (
              <NavLink key={item.path} to={item.path} className="mobile-drawer__quick-item" onClick={handleNavClick}>
                {Icon && <Icon />}
                <span>{item.title}</span>
              </NavLink>
            )
          })}
        </div>

        <p className="mobile-drawer__section-title">전체 메뉴보기</p>
        <div className="mobile-drawer__full-list">
          {fullMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `mobile-drawer__full-item ${isActive ? 'is-active' : ''}`.trim()}
              onClick={handleNavClick}
            >
              {item.menuLabel ?? item.title}
            </NavLink>
          ))}
        </div>

        <button type="button" className="mobile-drawer__logout" onClick={onLogoutClick}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          로그아웃
        </button>
      </aside>
    </>
  )
}
