import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { deleteSite } from '../api/siteApi'
import SiteCard from '../components/SiteCard'
import { useSite } from '../useSite'
import { canManageSites } from '../utils/sitePolicy'
import { useAuth } from '@/features/auth/useAuth'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { ROUTE_PATHS, buildPath } from '@/shared/constants/routePaths'
import './sitePageShell.css'
import './SiteSelectPage.css'

// 현장 선택·관리. SiteRoute 대상이 아니므로(=여기로 리다이렉트해도 되돌아오지 않음) 가드 루프의 종착점
export default function SiteSelectPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, role, logout } = useAuth()
  const { sites, currentSite, isInitialized, isLoadingSites, siteLoadError, loadSites, refreshSites, selectSite } =
    useSite()

  const [keyword, setKeyword] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteResult, setDeleteResult] = useState('')

  const manageable = canManageSites(role)
  // 모바일 로그인에서 넘어온 경우 선택 후 /m/dashboard로 복귀 필요
  const nextPath = searchParams.get('next') === ROUTE_PATHS.mobileDashboard ? ROUTE_PATHS.mobileDashboard : ROUTE_PATHS.dashboard

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
    navigate(nextPath, { replace: true })
  }

  async function handleDelete() {
    const target = deleteTarget
    // 실패하면 여기서 throw되어 아래 정리(모달 닫기/목록 갱신)가 실행되지 않음 — 대상 유지, 실패 메시지는 인터셉터가 전역 표시
    await deleteSite(target.siteId)
    setDeleteTarget(null)
    await refreshSites().catch(() => {}) // 삭제된 현장이 currentSite였으면 refresh 중 normalize가 선택을 해제
    setDeleteResult(`${target.name} 현장이 삭제되었습니다.`)
  }

  if (siteLoadError) {
    return (
      <div className="site-shell">
        <div className="site-shell__inner u-flex-col u-gap-12">
          <ErrorState message={siteLoadError} onRetry={() => loadSites({ force: true }).catch(() => {})} />
          <div>
            <Button variant="secondary" onClick={logout}>
              로그아웃
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
    <div className="site-shell">
      <div className="site-shell__inner">
        <div className="site-shell__topbar">
          <span className="site-shell__brand">
            <img src="/ArcGuard.png" alt="" className="site-shell__logo" />
            ArcGuard
          </span>
          <span className="site-shell__user">
            {user && (
              <span className="u-text-secondary">
                {user.name} · {USER_ROLE_LABELS[role] ?? role}
              </span>
            )}
            <Button variant="ghost" onClick={logout}>
              로그아웃
            </Button>
          </span>
        </div>

        <div className="site-shell__head">
          <div>
            <h1 className="site-shell__title">현장을 선택해주세요</h1>
            <p className="site-shell__subtitle">
              선택한 현장 기준으로 관제·설비·직원 화면이 표시됩니다. 선택 후에도 상단에서 언제든 바꿀 수 있습니다.
            </p>
          </div>
          {manageable && (
            <Button variant="primary" onClick={() => navigate(ROUTE_PATHS.settingsSiteAdd)}>
              현장 등록
            </Button>
          )}
        </div>

        {/* 백엔드에 현장 검색 API가 없어 받아온 목록 안에서만 이름으로 필터링 */}
        {sites.length > 0 && (
          <div className="site-select__search">
            <Input
              label="현장 검색"
              placeholder="현장 이름"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <p className="site-select__count">전체 {sites.length}개 현장</p>
          </div>
        )}

        {sites.length === 0 && (
          <EmptyState
            message="등록된 현장이 없습니다."
            description={manageable ? '현장 등록 버튼을 눌러 첫 현장을 만들어주세요.' : undefined}
            action={
              manageable ? (
                <Button variant="primary" onClick={() => navigate(ROUTE_PATHS.settingsSiteAdd)}>
                  현장 등록
                </Button>
              ) : undefined
            }
          />
        )}

        {sites.length > 0 && filtered.length === 0 && (
          <EmptyState message="검색 결과가 없습니다." description="현장 이름의 일부만 입력해도 검색됩니다." />
        )}

        <div className="site-select__grid">
          {filtered.map((site) => (
            <SiteCard
              key={site.siteId}
              site={site}
              manageable={manageable}
              isCurrent={currentSite?.siteId === site.siteId}
              onEnter={handleEnter}
              onEdit={(target) => navigate(buildPath(ROUTE_PATHS.settingsSiteEdit, { siteId: target.siteId }))}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      </div>

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        danger
        title="현장 삭제"
        message={`${deleteTarget?.name ?? ''} 현장을 삭제하시겠습니까? 삭제된 현장은 현장 선택 목록에서 제외됩니다.`}
        confirmLabel="삭제"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ActionResultModal
        visible={Boolean(deleteResult)}
        type="success"
        title="현장 삭제"
        subtitle={deleteResult}
        onClose={() => setDeleteResult('')}
      />
    </div>
  )
}
