import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { resolveSiteEntry } from '@/features/sites/utils/siteEntry'
import Button from '@/shared/components/buttons/Button'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'

// currentSite가 있어야 의미가 있는 업무 화면 전용 가드 (ProtectedRoute → RoleRoute 통과 후 적용)
// 이 가드가 붙은 라우트로는 절대 리다이렉트 안 함 — /select-site, /site-unassigned는 대상 밖이라 왕복 루프 없음
export default function SiteRoute({ children }) {
  const { role, logout } = useAuth()
  const { sites, currentSite, isInitialized, isLoadingSites, siteLoadError, loadSites } = useSite()
  const location = useLocation()
  const isMobile = location.pathname.startsWith('/m')

  // 초기화 전 1회만 조회. loadSites가 진행 중 요청을 공유해서 가드가 여러 번 렌더돼도 호출은 한 번
  useEffect(() => {
    if (isInitialized || isLoadingSites || siteLoadError) return
    loadSites().catch(() => {}) // 실패 표시는 siteLoadError로 이미 처리됨
  }, [isInitialized, isLoadingSites, siteLoadError, loadSites])

  if (siteLoadError) {
    return (
      <div className="u-flex-col u-gap-12" style={{ padding: 'var(--space-24)' }}>
        <ErrorState message={siteLoadError} onRetry={() => loadSites({ force: true }).catch(() => {})} />
        <div>
          <Button variant="secondary" onClick={logout}>
            로그아웃
          </Button>
        </div>
      </div>
    )
  }

  if (!isInitialized) return <LoadingState label="현장 정보를 불러오는 중입니다..." />

  if (!currentSite) {
    const { path, autoSelect } = resolveSiteEntry({ role, sites, isMobile })
    // autoSelect 대상이 남아있다는 건 normalize가 아직 반영되기 전이라는 뜻 — 대시보드로 되돌리면 이 가드로 다시 들어와 루프됨
    if (autoSelect) return <LoadingState label="현장 정보를 불러오는 중입니다..." />
    return <Navigate to={path} replace />
  }

  return children
}
