import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSystemReleases, getSystemVersion } from '../api/systemApi'
import SystemReleaseCreateModal from '../components/SystemReleaseCreateModal'
import { useAuth } from '@/features/auth/useAuth'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import DataTable from '@/shared/components/data-display/DataTable'
import Pagination from '@/shared/components/data-display/Pagination'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import { ROLES } from '@/shared/constants/roles'
import './SystemAboutPage.css'

const PAGE_SIZE = 11

// SCR-702 SW 버전 정보. 히어로 카드는 등록된 이력 중 최신 소프트웨어/AI 모델 버전만 보여주고,
// 업데이트 이력은 SUPER_ADMIN이 이 화면에서 직접 등록한다(자동 기록 소스 없음).
export default function SystemAboutPage() {
  const { role } = useAuth()
  const [version, setVersion] = useState(null)
  const [releases, setReleases] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [versionData, releasePage] = await Promise.all([
        getSystemVersion(),
        getSystemReleases({ page: page - 1, size: PAGE_SIZE }),
      ])
      setVersion(versionData)
      setReleases(releasePage.content)
      setTotalElements(releasePage.totalElements)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const actions = useMemo(
    () =>
      role === ROLES.SUPER_ADMIN ? (
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          업데이트 등록
        </Button>
      ) : null,
    [role],
  )
  usePageActions(actions)

  function handleCreated() {
    setPage(1)
    load()
  }

  if (loading) return <LoadingState label="버전 정보를 불러오는 중입니다..." />
  if (loadError) return <ErrorState onRetry={load} />

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))

  return (
    <div className="system-about">
      <BaseCard>
        <div className="system-about__summary">
          <div className="system-about__summary-item">
            <span className="system-about__summary-label">소프트웨어 버전</span>
            <strong>{version?.version ? `v${version.version}` : '-'}</strong>
          </div>
          <div className="system-about__summary-item">
            <span className="system-about__summary-label">알고리즘 모델 버전</span>
            <strong>{version?.modelVersion ? `v${version.modelVersion}` : '-'}</strong>
          </div>
          <div className="system-about__summary-item">
            <span className="system-about__summary-label">최근 업데이트</span>
            <strong>{version?.lastUpdatedAt?.slice(0, 10) ?? '-'}</strong>
          </div>
        </div>
      </BaseCard>

      <h2 className="system-about__section-title">업데이트 이력</h2>
      {/* 표 자체 테두리가 "표+페이지네이션" 세트의 경계 — 감싸는 카드를 따로 두지 않는다(계정/설비 관리이력과 동일 패턴) */}
      <DataTable
          rows={releases}
          rowKey={(row) => `${row.type}-${row.version}-${row.releasedAt}`}
          emptyMessage="업데이트 이력이 없습니다."
          columns={[
            { key: 'version', header: '버전' },
            { key: 'typeLabel', header: '구분' },
            { key: 'description', header: '변경 내용', render: (row) => row.description ?? '-' },
            {
              key: 'releasedAt',
              header: '등록일',
              className: 'system-about__time-cell',
              render: (row) => row.releasedAt?.slice(0, 10) ?? '-',
            },
            { key: 'updatedBy', header: '등록자', render: (row) => row.updatedBy ?? '-' },
            {
              key: 'status',
              header: '상태',
              render: (row) => {
                const isCurrent =
                  (row.type === 'SOFTWARE' && row.version === version?.version) ||
                  (row.type === 'MODEL' && row.version === version?.modelVersion)
                return (
                  <span
                    className="badge"
                    style={{
                      color: isCurrent ? 'var(--color-success)' : 'var(--color-text-muted)',
                      background: 'var(--color-surface-muted)',
                    }}
                  >
                    {isCurrent ? '적용중' : '이전버전'}
                  </span>
                )
              },
            },
          ]}
        />

      {releases.length > 0 && (
        <div className="system-about__footer">
          <p className="system-about__count">총 {totalElements}건</p>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <SystemReleaseCreateModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </div>
  )
}
