import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSite } from '../useSite'
import { canManageSites } from '../utils/sitePolicy'
import { resolveSiteEntry } from '../utils/siteEntry'
import { useAuth } from '@/features/auth/useAuth'
import Button from '@/shared/components/buttons/Button'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './sitePageShell.css'
import './SiteUnassignedPage.css'

// ADMIN/GENERAL 전용 — 배정된 현장이 0개라 들어갈 화면 자체가 없는 상태
export default function SiteUnassignedPage() {
  const navigate = useNavigate()
  const { role, logout } = useAuth()
  const { sites, refreshSites, selectSite } = useSite()
  const [checking, setChecking] = useState(false)

  // SUPER_ADMIN은 배정 개념이 없어 이 화면에 머무를 이유 없음
  if (canManageSites(role)) return <Navigate to={ROUTE_PATHS.siteSelect} replace />

  async function handleRecheck() {
    setChecking(true)
    try {
      const list = await refreshSites()
      const { path, autoSelect } = resolveSiteEntry({ role, sites: list })
      if (autoSelect) selectSite(autoSelect)
      if (path !== ROUTE_PATHS.siteUnassigned) navigate(path, { replace: true }) // 0개면 이 화면 유지
    } catch {
      // 실패 메시지는 인터셉터가 전역 표시 — 화면은 그대로 두고 재시도만 가능하게
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="site-shell">
      <div className="site-shell__inner site-unassigned">
        <h1 className="site-shell__title">배정된 현장이 없습니다</h1>
        <p className="site-shell__subtitle">
          담당 현장이 배정되어야 관제·설비 화면을 이용할 수 있습니다. 상위 관리자에게 현장 배정을 요청해주세요.
        </p>
        {sites.length > 0 && <p className="u-text-muted">현장 배정이 확인되었습니다. 다시 확인을 눌러주세요.</p>}

        <div className="site-unassigned__actions">
          <Button variant="primary" loading={checking} onClick={handleRecheck}>
            다시 확인
          </Button>
          <Button variant="secondary" onClick={logout}>
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  )
}
