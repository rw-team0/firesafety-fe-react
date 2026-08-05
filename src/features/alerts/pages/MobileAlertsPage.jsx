import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { bulkConfirmAlerts, getPendingAlerts } from '../api/alertApi'
import { extractServerMessage, formatAlertType, formatDateTimeCell } from '../utils/alertFormatters'
import { useMonitoring } from '@/features/monitoring/useMonitoring'
import { useSite } from '@/features/sites/useSite'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { useAuth } from '@/features/auth/useAuth'
import { ROUTE_PATHS, buildPath } from '@/shared/constants/routePaths'
import { formatResultDateTime } from '@/shared/utils/formatters'
import './MobileAlertsPage.css'

const PAGE_SIZE = 8
// "전체 확인처리" 대상 조회용 — 서버 AlertService.MAX_SIZE(100)를 넘기면 INVALID_SIZE로 요청 자체가 실패하므로
// 100 이하로 고정하고, 그보다 미확인이 많으면 페이지를 반복 조회해서 전부 모은다
const BULK_CONFIRM_PAGE_SIZE = 100

// SCR-301-M 모바일 알림 — PC 미처리 조치 탭(getPendingAlerts)과 같은 데이터: UNCONFIRMED/CONFIRMED만 옴(RESOLVED 없음)
export default function MobileAlertsPage() {
  const { user } = useAuth()
  const { currentSiteId } = useSite()
  const { refreshedAt, summary } = useMonitoring()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestSeqRef = useRef(0)

  const dashboardAlertId = searchParams.get('alertId')

  const [alerts, setAlerts] = useState([])
  const [nextPage, setNextPage] = useState(0) // 0-based,다음에 불러올 페이지
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true) // 최초 로드
  const [loadingMore, setLoadingMore] = useState(false) // 스크롤로 추가 로드 중
  const [loadError, setLoadError] = useState('')
  const sentinelRef = useRef(null)

  const [actionResult, setActionResult] = useState(null)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkError, setBulkError] = useState('')
  const hasUnconfirmed = Number(summary?.unconfirmedAlertCount ?? 0) > 0

  // 최초 진입/현장 변경/조용한 갱신 공용 — 항상 1페이지째부터 다시 채운다(무한스크롤 중간 페이지만 갱신하는 복잡도를 피함)
  const loadFirstPage = useCallback(
    async ({ silent = false } = {}) => {
      const siteId = currentSiteId
      const seq = requestSeqRef.current + 1
      requestSeqRef.current = seq

      if (!siteId) {
        setAlerts([])
        setHasMore(false)
        setLoading(false)
        return
      }

      if (!silent) {
        setLoading(true)
        setLoadError('')
      }

      try {
        const data = await getPendingAlerts({ siteId, page: 0, size: PAGE_SIZE })
        if (requestSeqRef.current !== seq) return
        const content = Array.isArray(data?.content) ? data.content : []
        setAlerts(content)
        setNextPage(1)
        setHasMore(content.length === PAGE_SIZE)
        setLoadError('')
      } catch (error) {
        if (requestSeqRef.current !== seq) return
        if (!silent) setLoadError(extractServerMessage(error, '미처리 알림을 불러오지 못했습니다.'))
      } finally {
        if (requestSeqRef.current === seq) setLoading(false)
      }
    },
    [currentSiteId],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFirstPage()
  }, [loadFirstPage])

  useEffect(() => {
    // MonitoringProvider가 WS/폴링으로 새 신호를 줄 때마다 화면 깜빡임 없이 조용히 다시 조회
    if (!refreshedAt) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFirstPage({ silent: true })
  }, [refreshedAt, loadFirstPage])

  // 스크롤 끝 감지로 다음 페이지 이어붙이기
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore) return
    const siteId = currentSiteId
    if (!siteId) return
    setLoadingMore(true)
    try {
      const data = await getPendingAlerts({ siteId, page: nextPage, size: PAGE_SIZE })
      const content = Array.isArray(data?.content) ? data.content : []
      setAlerts((prev) => [...prev, ...content])
      setNextPage((prev) => prev + 1)
      setHasMore(content.length === PAGE_SIZE)
    } catch {
      setHasMore(false) // 실패 시 무한 재시도하지 않음 — 현장 전환 등으로 다시 로드되면 복구됨
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loading, loadingMore, currentSiteId, nextPage])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { threshold: 0.1 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore])

  // 대시보드/헤더 종 아이콘 등에서 특정 알림으로 들어온 경우 — 그 알림이 속한 설비 상세로 바로 넘긴다
  useEffect(() => {
    if (!dashboardAlertId || loading) return
    const matched = alerts.find((alert) => String(alert.alertId) === dashboardAlertId)
    if (matched) handleRowClick(matched)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardAlertId, loading, alerts])

  // 목록에서 항목을 눌러도 여기서 바로 처리하지 않는다 — 확인/조치완료는 설비 상세 화면 상단에서 처리한다
  function handleRowClick(alert) {
    if (!alert.panelId) return
    navigate(`${buildPath(ROUTE_PATHS.mobileEquipmentDetail, { panelId: alert.panelId })}?alertId=${encodeURIComponent(alert.alertId)}`)
  }

  // 서버 페이지 크기 상한(100) 안에서 미처리 알림 전체를 모을 때까지 반복 조회
  async function fetchAllPendingAlerts(siteId) {
    const first = await getPendingAlerts({ siteId, page: 0, size: BULK_CONFIRM_PAGE_SIZE })
    let content = Array.isArray(first?.content) ? first.content : []
    const totalElements = Number(first?.totalElements ?? content.length)
    const totalPages = Math.ceil(totalElements / BULK_CONFIRM_PAGE_SIZE)
    for (let p = 1; p < totalPages; p += 1) {
      const data = await getPendingAlerts({ siteId, page: p, size: BULK_CONFIRM_PAGE_SIZE })
      content = content.concat(Array.isArray(data?.content) ? data.content : [])
    }
    return content
  }

  // 미확인 전체 확인처리 — 사이트 전체(현재 페이지뿐 아니라) UNCONFIRMED 대상. 대상 ID만 모아서 서버 일괄
  // 확인 API를 한 번만 호출한다(건별 반복 호출 시 실시간 갱신 신호가 건마다 나가 폭주하던 문제를 서버에서 해결)
  async function handleBulkConfirmAll() {
    setBulkError('')
    const siteId = currentSiteId
    if (!siteId) return
    try {
      const all = await fetchAllPendingAlerts(siteId)
      const targetIds = all.filter((alert) => alert.status === 'UNCONFIRMED').map((alert) => alert.alertId)
      setBulkConfirmOpen(false)
      if (!targetIds.length) return
      const { successCount, failCount, failureReasons } = await bulkConfirmAlerts(targetIds)
      setActionResult({
        title: failCount ? `미확인 중 ${successCount}건이 확인 처리되었습니다.` : `미확인 ${successCount}건이 확인 처리되었습니다.`,
        infoRows: [
          { label: '처리 결과', value: `성공 ${successCount}건${failCount ? `, 실패 ${failCount}건` : ''}` },
          ...(failureReasons?.length ? [{ label: '실패 사유', value: failureReasons.join(', ') }] : []),
          { label: '처리 시각', value: formatResultDateTime() },
          { label: '확인자', value: user?.name ?? '-' },
        ],
      })
      loadFirstPage()
    } catch (error) {
      setBulkError(extractServerMessage(error, '미확인 알림을 불러오지 못했습니다.'))
    }
  }

  function goSettings() {
    navigate(ROUTE_PATHS.mobileAlertSettings)
  }

  return (
    <div className="mobile-alerts">
      <div className="mobile-alerts__header">
        <h1>알림</h1>
        <div className="mobile-alerts__actions">
          {hasUnconfirmed && (
            <button
              type="button"
              className="mobile-alerts__bulk-btn"
              onClick={() => {
                setBulkError('')
                setBulkConfirmOpen(true)
              }}
            >
              전체 확인처리
            </button>
          )}
          <button type="button" className="mobile-alerts__settings-btn" aria-label="알림 설정" onClick={goSettings}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a1.94 1.94 0 0 1-2.74 2.74l-.06-.06A1.6 1.6 0 0 0 15.21 19a1.6 1.6 0 0 0-.96 1.46v.17a1.94 1.94 0 0 1-3.88 0v-.09A1.6 1.6 0 0 0 9.34 19a1.6 1.6 0 0 0-1.77.32l-.06.06a1.94 1.94 0 0 1-2.74-2.74l.06-.06A1.6 1.6 0 0 0 5.15 15a1.6 1.6 0 0 0-1.46-.96h-.17a1.94 1.94 0 0 1 0-3.88h.09A1.6 1.6 0 0 0 5.15 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.94 1.94 0 0 1 2.74-2.74l.06.06A1.6 1.6 0 0 0 9.34 5a1.6 1.6 0 0 0 .96-1.46v-.17a1.94 1.94 0 0 1 3.88 0v.09A1.6 1.6 0 0 0 15.21 5a1.6 1.6 0 0 0 1.77-.32l.06-.06a1.94 1.94 0 0 1 2.74 2.74l-.06.06A1.6 1.6 0 0 0 19.4 9c.15.5.55.88 1.04.96h.17a1.94 1.94 0 0 1 0 3.88h-.09A1.6 1.6 0 0 0 19.4 15Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="알림을 불러오는 중입니다..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={loadFirstPage} />
      ) : alerts.length === 0 ? (
        <EmptyState message="새 알림이 없습니다." description="현재 선택 현장의 미확인·확인 경보가 없습니다." />
      ) : (
        <>
          <ul className="mobile-alerts__list">
            {alerts.map((alert) => (
              <li
                key={alert.alertId}
                className={`mobile-alerts__item ${alert.status === 'UNCONFIRMED' ? 'is-unread' : 'is-read'}`.trim()}
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(alert)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleRowClick(alert)
                  }
                }}
              >
                {alert.status === 'UNCONFIRMED' && <span className="mobile-alerts__dot" aria-hidden="true" />}
                <div className="mobile-alerts__body">
                  <div className="mobile-alerts__row-top">
                    <span className="mobile-alerts__type-badge">{formatAlertType(alert.type)}</span>
                    <strong className="mobile-alerts__panel">{alert.panelName ?? '-'}</strong>
                  </div>
                  <time className="mobile-alerts__time">{formatDateTimeCell(alert.triggeredAt)}</time>
                </div>
              </li>
            ))}
          </ul>

          {/* 스크롤 끝 감지용 sentinel — 더 불러올 게 있을 때만 관찰 대상으로 둔다 */}
          {hasMore && (
            <div ref={sentinelRef} className="mobile-alerts__sentinel">
              {loadingMore && <LoadingState label="더 불러오는 중입니다..." />}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        visible={bulkConfirmOpen}
        title="미확인 전체 확인처리"
        confirmLabel="확인 처리"
        onCancel={() => {
          setBulkConfirmOpen(false)
          setBulkError('')
        }}
        onConfirm={handleBulkConfirmAll}
      >
        <div className="confirm-modal__summary">
          <span className="confirm-modal__summary-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="confirm-modal__summary-body">
            <p className="confirm-modal__summary-detail">현재 현장의 미확인 알림 전체를 확인 처리합니다.</p>
          </div>
        </div>
        {bulkError && (
          <p className="banner banner-danger" role="alert">
            {bulkError}
          </p>
        )}
      </ConfirmModal>

      <ActionResultModal
        visible={Boolean(actionResult)}
        title={actionResult?.title}
        infoRows={actionResult?.infoRows ?? []}
        onClose={() => setActionResult(null)}
      />
    </div>
  )
}
