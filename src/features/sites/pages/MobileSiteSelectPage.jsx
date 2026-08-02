import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSite } from '../useSite'
import { useAuth } from '@/features/auth/useAuth'
import Input from '@/shared/components/forms/Input'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './MobileSiteSelectPage.css'
import './SiteSelectPage.css'

// 로그아웃 아이콘 버튼 — MobileLayout/MobileDrawer와 동일 SVG
function LogoutIconButton({ onClick }) {
  return (
    <button type="button" className="mobile-site-select__logout" onClick={onClick} aria-label="로그아웃" title="로그아웃">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  )
}

// 이름/주소만 보여주는 행 전체 클릭형 카드 — 입장 버튼 없이 클릭하면 바로 선택+이동
function MobileSiteRow({ site, isCurrent, onSelect }) {
  return (
    <div
      className={`mobile-site-select__row ${isCurrent ? 'is-current' : ''}`.trim()}
      role="button"
      tabIndex={0}
      aria-label={`${site.name} 현장 선택`}
      onClick={() => onSelect(site)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(site)
        }
      }}
    >
      <div className="mobile-site-select__row-text">
        <span className="mobile-site-select__row-name">{site.name}</span>
        <span className="mobile-site-select__row-address">{site.address || '주소 미등록'}</span>
      </div>
      {isCurrent && <span className="mobile-site-select__row-badge">선택됨</span>}
    </div>
  )
}

function MobileSiteHeader({ onLogout }) {
  return (
    <header className="mobile-site-select__header">
      <span className="mobile-site-select__brand">
        <img src="/ArcGuard.png" alt="" className="mobile-site-select__logo" />
        ArcGuard
      </span>
      <LogoutIconButton onClick={onLogout} />
    </header>
  )
}

// 모바일 현장 선택 — 선택·입장만 제공, 등록/수정/삭제 없음(관리 액션은 PC 설정 화면 전용)
export default function MobileSiteSelectPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { sites, currentSite, isInitialized, isLoadingSites, siteLoadError, loadSites, selectSite } = useSite()
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (isInitialized || isLoadingSites || siteLoadError) return
    loadSites().catch(() => {})
  }, [isInitialized, isLoadingSites, siteLoadError, loadSites])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return sites
    return sites.filter((site) => site.name?.toLowerCase().includes(q))
  }, [sites, keyword])

  function handleEnter(site) {
    selectSite(site)
    navigate(ROUTE_PATHS.mobileDashboard, { replace: true })
  }

  if (siteLoadError) {
    return (
      <div className="mobile-site-select">
        <MobileSiteHeader onLogout={logout} />
        <div className="mobile-site-select__body">
          <ErrorState message={siteLoadError} onRetry={() => loadSites({ force: true }).catch(() => {})} />
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="mobile-site-select">
        <MobileSiteHeader onLogout={logout} />
        <div className="mobile-site-select__body">
          <LoadingState label="현장 정보를 불러오는 중입니다..." />
        </div>
      </div>
    )
  }

  // 배정 현장이 없으면 선택할 게 없어 안내 화면으로(관리 기능이 없으니 등록 유도 없이 안내만)
  if (sites.length === 0) return <Navigate to={ROUTE_PATHS.siteUnassigned} replace />

  return (
    <div className="mobile-site-select">
      <MobileSiteHeader onLogout={logout} />
      <div className="mobile-site-select__body">
        <div className="site-select__search">
          <Input
            label="현장 검색"
            placeholder="현장 이름"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <p className="site-select__count">전체 {sites.length}개 현장</p>
        </div>

        {filtered.length === 0 && (
          <EmptyState message="검색 결과가 없습니다." description="현장 이름의 일부만 입력해도 검색됩니다." />
        )}

        <div className="mobile-site-select__list">
          {filtered.map((site) => (
            <MobileSiteRow
              key={site.siteId}
              site={site}
              isCurrent={currentSite?.siteId === site.siteId}
              onSelect={handleEnter}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
