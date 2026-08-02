import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import SiteCreateModal from '../components/SiteCreateModal'
import SiteEditModal from '../components/SiteEditModal'
import { useSite } from '../useSite'
import { canManageSites } from '../utils/sitePolicy'
import { useAuth } from '@/features/auth/useAuth'
import Button from '@/shared/components/buttons/Button'
import Select from '@/shared/components/forms/Select'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './sitePageShell.css'
import './SiteSelectPage.css'

// 현장 선택·관리(PC 전용). SiteRoute 대상이 아니므로(=여기로 리다이렉트해도 되돌아오지 않음) 가드 루프의 종착점
// 모바일은 MobileSiteSelectPage(선택만, 관리 액션 없음) 별도 페이지 사용
export default function SiteSelectPage() {
  const navigate = useNavigate()
  const { user, role, logout } = useAuth()
  const { sites, currentSite, isInitialized, isLoadingSites, siteLoadError, loadSites, refreshSites, selectSite } =
    useSite()

  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const manageable = canManageSites(role)

  useEffect(() => {
    if (isInitialized || isLoadingSites || siteLoadError) return
    loadSites().catch(() => {})
  }, [isInitialized, isLoadingSites, siteLoadError, loadSites])

  // 목록이 바뀌어도(등록/삭제) 선택값이 유효하면 유지, 아니면 현재 현장 또는 첫 번째로 보정
  useEffect(() => {
    if (sites.length === 0) {
      setSelectedSiteId('')
      return
    }
    if (sites.some((site) => String(site.siteId) === String(selectedSiteId))) return
    setSelectedSiteId(String(currentSite?.siteId ?? sites[0].siteId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites])

  const selectedSite = useMemo(
    () => sites.find((site) => String(site.siteId) === String(selectedSiteId)) ?? null,
    [sites, selectedSiteId],
  )

  function handleEnter() {
    if (!selectedSite) return
    selectSite(selectedSite)
    navigate(ROUTE_PATHS.dashboard, { replace: true })
  }

  function handleCreated() {
    refreshSites().catch(() => {})
  }

  function handleUpdated(updatedSite) {
    refreshSites().catch(() => {})
    if (updatedSite && currentSite && String(currentSite.siteId) === String(updatedSite.siteId)) {
      selectSite(updatedSite)
    }
  }

  // 완료 안내는 SiteEditModal이 이미 자체 ActionResultModal로 보여준 뒤 호출 — 여기선 목록/현재 현장만 정리
  function handleDeleted({ siteId }) {
    refreshSites().catch(() => {})
    if (currentSite && String(currentSite.siteId) === String(siteId)) selectSite(null)
  }

  if (siteLoadError) {
    return (
      <div className="site-shell">
        <div className="site-shell__inner u-flex-col u-gap-12">
          <ErrorState message={siteLoadError} onRetry={() => loadSites({ force: true }).catch(() => {})} />
          <div>
            <Button variant="secondary" onClick={logout} aria-label="로그아웃" title="로그아웃">
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
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="site-shell">
        <div className="site-shell__inner">
          <LoadingState label="현장 정보를 불러오는 중입니다..." />
        </div>
      </div>
    )
  }

  // 배정 현장이 하나도 없는 일반/현장관리자는 선택할 게 없어 전용 안내 화면으로
  if (!manageable && sites.length === 0) return <Navigate to={ROUTE_PATHS.siteUnassigned} replace />

  return (
    <>
      <header className="site-shell__topbar">
        {user && (
          <span className="u-text-secondary">
            {user.name} · {USER_ROLE_LABELS[role] ?? role}
          </span>
        )}
        <Button variant="ghost" className="site-select__logout-btn" onClick={logout}>
          로그아웃
        </Button>
      </header>

      <div className="site-shell site-select__shell">
        <div className="site-shell__inner">
          {sites.length === 0 ? (
            <EmptyState
              message="등록된 현장이 없습니다."
              description={manageable ? '현장 등록 버튼을 눌러 첫 현장을 만들어주세요.' : undefined}
              action={
                manageable ? (
                  <Button variant="primary" onClick={() => setCreateOpen(true)}>
                    현장 등록
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="site-select__center">
              <div className="site-select__hero">
                <h1 className="site-select__hero-title">
                  <img src="/ArcGuard.png" alt="" className="site-select__hero-logo" />
                  ArcGuard
                </h1>
                <p className="site-select__hero-subtitle">전기화재 예방 모니터링</p>
              </div>

              <div className="site-select__picker">
                <Select
                  aria-label="현장 선택"
                  value={selectedSiteId}
                  onChange={(event) => setSelectedSiteId(event.target.value)}
                  options={sites.map((site) => ({ value: String(site.siteId), label: site.name }))}
                />
                {manageable && (
                  <Button variant="secondary" onClick={() => setEditOpen(true)} disabled={!selectedSite}>
                    수정
                  </Button>
                )}
                {manageable && (
                  <Button variant="primary" className="site-select__create-btn" onClick={() => setCreateOpen(true)}>
                    + 등록
                  </Button>
                )}
              </div>

              {selectedSite && (
                <button type="button" className="site-select__shortcut" onClick={handleEnter}>
                  <span className="site-select__shortcut-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 21V8l9-5 9 5v13h-6v-7H9v7H3z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="site-select__shortcut-footer">
                    <span className="site-select__shortcut-body">
                      <span className="site-select__shortcut-title">{selectedSite.name}</span>
                      <span className="site-select__shortcut-desc">{selectedSite.address || '주소 미등록'}</span>
                    </span>
                    <span className="site-select__shortcut-arrow" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <SiteCreateModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />

        <SiteEditModal
          visible={editOpen}
          site={selectedSite}
          onClose={() => setEditOpen(false)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      </div>
    </>
  )
}
