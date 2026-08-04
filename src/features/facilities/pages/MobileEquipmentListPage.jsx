import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPanels } from '../api/facilityApi'
import { extractServerMessage, formatOnline, formatPanelStatus, PANEL_STATUS_OPTIONS } from '../utils/facilityFormatters'
import { useMonitoring } from '@/features/monitoring/useMonitoring'
import { useSite } from '@/features/sites/useSite'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import Select from '@/shared/components/forms/Select'
import { ROUTE_PATHS, buildPath } from '@/shared/constants/routePaths'
import { formatDateTime } from '@/shared/utils/formatters'
import './MobileEquipmentPages.css'

function getPanelCardClassName(status) {
  const normalizedStatus = String(status ?? '').toLowerCase()
  return `mobile-equipment-card mobile-equipment-card--${normalizedStatus || 'unknown'}`
}

// 카드 맨 왼쪽 상태 아이콘 — 뱃지 텍스트와 별개로 한눈에 훑을 수 있게
function PanelStatusIcon({ status }) {
  const className = `mobile-equipment-card__icon mobile-equipment-card__icon--${String(status ?? '').toLowerCase() || 'unknown'}`

  if (status === 'RISK') {
    return (
      <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (status === 'CAUTION') {
    return (
      <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  if (status === 'OFFLINE') {
    return (
      <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 12.5a11 11 0 0 1 3.5-2.3M12 8c2.3 0 4.5.7 6.3 2M8.5 15.5a5.5 5.5 0 0 1 3.5-1.3c.7 0 1.4.13 2 .37" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 19h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 12.5l2.3 2.3L15.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// SCR-501-M 설비 모니터링 — 상태별 필터 + 분전반 목록. 행 탭 시 바로 상세(SCR-202-M)로 이동한다
export default function MobileEquipmentListPage() {
  const { currentSiteId } = useSite()
  const { refreshedAt } = useMonitoring()
  const navigate = useNavigate()
  const requestSeqRef = useRef(0)

  const [panels, setPanels] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadPanels = useCallback(
    async ({ silent = false } = {}) => {
      const siteId = currentSiteId
      const seq = requestSeqRef.current + 1
      requestSeqRef.current = seq

      if (!siteId) {
        setPanels([])
        setLoading(false)
        return
      }

      if (!silent) {
        setLoading(true)
        setLoadError('')
      }

      try {
        const data = await getPanels({ siteId, status: statusFilter || undefined })
        if (requestSeqRef.current !== seq) return
        setPanels(Array.isArray(data?.content) ? data.content : [])
        setLoadError('')
      } catch (error) {
        if (requestSeqRef.current !== seq) return
        if (!silent) {
          const status = error?.response?.status
          setLoadError(
            extractServerMessage(error, status === 403 ? '현재 현장의 설비를 조회할 권한이 없습니다.' : '설비 목록을 불러오지 못했습니다.'),
          )
        }
      } finally {
        if (requestSeqRef.current === seq) setLoading(false)
      }
    },
    [currentSiteId, statusFilter],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPanels()
  }, [loadPanels])

  useEffect(() => {
    if (!refreshedAt) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPanels({ silent: true })
  }, [refreshedAt, loadPanels])

  function handlePanelClick(panel) {
    if (!panel?.panelId) return
    navigate(buildPath(ROUTE_PATHS.mobileEquipmentDetail, { panelId: panel.panelId }))
  }

  return (
    <div className="mobile-equipment-list">
      <div className="mobile-equipment-filter">
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          placeholder="전체 상태"
          options={PANEL_STATUS_OPTIONS}
          aria-label="상태 필터"
        />
      </div>

      {loading ? (
        <LoadingState label="설비 목록을 불러오는 중입니다..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={loadPanels} />
      ) : panels.length === 0 ? (
        <EmptyState message="조건에 맞는 분전반이 없습니다." />
      ) : (
        panels.map((panel) => (
          <button
            key={panel.panelId}
            type="button"
            className={getPanelCardClassName(panel.status)}
            onClick={() => handlePanelClick(panel)}
          >
            <PanelStatusIcon status={panel.status} />
            <span className="mobile-equipment-card__content">
              <span className="mobile-equipment-card__top">
                <strong>{panel.name || '-'}</strong>
                <StatusBadge status={panel.status} label={formatPanelStatus(panel.status)} />
              </span>
              <span className="mobile-equipment-card__row">
                <span>통신 상태</span>
                <strong>{formatOnline(panel.isOnline)}</strong>
              </span>
              <span className="mobile-equipment-card__row">
                <span>최근 통신</span>
                <strong>{formatDateTime(panel.lastCommunicatedAt)}</strong>
              </span>
            </span>
          </button>
        ))
      )}
    </div>
  )
}
