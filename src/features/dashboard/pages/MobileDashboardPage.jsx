import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPendingAlerts } from '@/features/alerts/api/alertApi'
import { useAuth } from '@/features/auth/useAuth'
import { useMonitoring } from '@/features/monitoring/useMonitoring'
import { useSite } from '@/features/sites/useSite'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import { ALERT_STATUS_LABELS, ALERT_TYPE_LABELS, USER_ROLE_LABELS, labelOf } from '@/shared/constants/domainLabels'
import { ALERT_STATUS_COLOR, colorOf } from '@/shared/constants/domainColors'
import { ROUTE_PATHS, buildPath } from '@/shared/constants/routePaths'
import { extractErrorMessage } from '@/shared/api/apiError'
import { formatDateTime } from '@/shared/utils/formatters'
import './MobileDashboardPage.css'

const PENDING_ACTION_SIZE = 3
const RISK_PANEL_LIMIT = 4

// 대시보드 요약 API 실패/빈 응답 시 화면 계산이 깨지지 않도록 쓰는 기본값 (PC DashboardPage와 동일 계약)
const EMPTY_SUMMARY = {
  totalPanelCount: 0,
  normalPanelCount: 0,
  cautionPanelCount: 0,
  riskPanelCount: 0,
  offlinePanelCount: 0,
  unconfirmedAlertCount: 0,
  unresolvedAlertCount: 0,
  panels: [],
}

function toPageContent(data) {
  return Array.isArray(data?.content) ? data.content : []
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

// 전체 설비 대비 비율 계산 (PC DashboardPage와 동일 규칙)
function formatPercent(value, total) {
  const denominator = Number(total ?? 0)
  if (!denominator) return '0.0%'
  return `${((Number(value ?? 0) / denominator) * 100).toFixed(1)}%`
}

function formatCircuitNo(value) {
  return value ? `${value}번` : '-'
}

function getRiskCardClassName(status) {
  const normalizedStatus = String(status ?? '').toLowerCase()
  return `mobile-dashboard-risk-card mobile-dashboard-risk-card--${normalizedStatus || 'unknown'}`
}

function formatRiskReason(panel) {
  const statusReasonMap = {
    NORMAL: '정상 상태',
    CAUTION: '주의 상태',
    RISK: '위험 상태',
    OFFLINE: '통신두절',
  }
  return statusReasonMap[panel?.status] ?? '상태 확인 필요'
}

// SCR-201-M 모바일 대시보드 — PC(SCR-201/DashboardPage)와 API·데이터 계약은 같지만 컴포넌트는 공유하지 않는다
export default function MobileDashboardPage() {
  const { user, role } = useAuth()
  const { currentSite, currentSiteId } = useSite()
  // 설비 상태 요약은 MonitoringProvider가 단일 출처 — 여기서 따로 재조회하지 않고 Context 값만 구독한다
  const { refreshedAt, summary: monitoringSummary } = useMonitoring()
  const navigate = useNavigate()
  const requestSeqRef = useRef(0)

  const [pendingActions, setPendingActions] = useState([])
  const [pendingTotal, setPendingTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [pendingError, setPendingError] = useState('')

  const summary = useMemo(() => ({ ...EMPTY_SUMMARY, ...(monitoringSummary ?? {}) }), [monitoringSummary])

  // 미처리조치 조회. silent=true면 WS/폴링 백그라운드 갱신 — 화면을 비우지 않고 성공한 값만 조용히 교체한다
  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      const siteId = currentSiteId
      const seq = requestSeqRef.current + 1
      requestSeqRef.current = seq

      if (!silent) {
        setPendingActions([])
        setPendingTotal(0)
        setPendingError('')
      }

      if (!siteId) {
        setLoading(false)
        if (!silent) setPageError('대시보드는 현장 선택 후 이용할 수 있습니다.')
        return
      }

      if (!silent) {
        setLoading(true)
        setPageError('')
      }

      try {
        const data = await getPendingAlerts({ siteId, page: 0, size: PENDING_ACTION_SIZE })
        if (requestSeqRef.current !== seq) return
        setPendingActions(toPageContent(data))
        setPendingTotal(Number(data?.totalElements ?? 0))
        setPendingError('')
      } catch (error) {
        if (requestSeqRef.current !== seq || silent) return
        setPendingError(extractErrorMessage(error, '미처리 알림을 불러오지 못했습니다.'))
      }

      setLoading(false)
    },
    [currentSiteId],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard()
    return () => {
      requestSeqRef.current += 1
    }
  }, [loadDashboard])

  useEffect(() => {
    // MonitoringProvider가 WS/폴링으로 새 신호를 줄 때마다 화면 깜빡임 없이 조용히 다시 조회(REQ-201)
    if (!refreshedAt) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard({ silent: true })
  }, [refreshedAt, loadDashboard])

  // 상단 2x2 요약 카드 — PC와 동일 4항목(전체/정상/이상/경보), 좁은 화면이라 비율·세부 meta는 생략
  const kpiItems = useMemo(() => {
    const total = Number(summary.totalPanelCount ?? 0)
    const normal = Number(summary.normalPanelCount ?? 0)
    const caution = Number(summary.cautionPanelCount ?? 0)
    const risk = Number(summary.riskPanelCount ?? 0)
    const offline = Number(summary.offlinePanelCount ?? 0)
    const abnormal = caution + risk + offline
    const unresolvedAlerts = Number(summary.unresolvedAlertCount ?? 0)

    return [
      { label: '전체 설비', value: total, unit: '대' },
      { label: '정상 가동', value: normal, unit: '대', percent: formatPercent(normal, total), percentStatus: 'NORMAL' },
      {
        label: '이상 감지',
        value: abnormal,
        unit: '대',
        percent: formatPercent(abnormal, total),
        percentStatus: 'CAUTION',
      },
      {
        // 경보는 건수 단위라 설비 대수(total)로 나눈 비율이 성립하지 않는다 — % 배지 없이 건수만 표시
        label: '경보 발생',
        value: unresolvedAlerts,
        unit: '건',
      },
    ]
  }, [summary])

  // 백엔드가 위험도 우선 정렬로 내려준 분전반 목록 중 모바일 표시 개수(4개)만 사용
  const riskPanels = useMemo(() => (summary.panels ?? []).slice(0, RISK_PANEL_LIMIT), [summary.panels])

  const handlePanelClick = useCallback(
    (panel) => {
      if (!panel?.panelId) return
      navigate(buildPath(ROUTE_PATHS.mobileEquipmentDetail, { panelId: panel.panelId }))
    },
    [navigate],
  )

  // 설비 상세 상단에서 바로 확인/조치완료 처리하므로 알림 목록을 거치지 않고 바로 그 설비로 이동한다
  const handlePendingAlertClick = useCallback(
    (alert) => {
      if (!alert?.alertId || !alert?.panelId) return
      navigate(`${buildPath(ROUTE_PATHS.mobileEquipmentDetail, { panelId: alert.panelId })}?alertId=${encodeURIComponent(alert.alertId)}`)
    },
    [navigate],
  )

  const handlePendingMoreClick = useCallback(() => {
    navigate(`${ROUTE_PATHS.mobileAlerts}?tab=pending`)
  }, [navigate])

  const handleEquipmentMoreClick = useCallback(() => {
    navigate(ROUTE_PATHS.mobileEquipmentList)
  }, [navigate])

  if (loading) return <LoadingState label="대시보드 데이터를 불러오는 중입니다..." />

  if (pageError) return <ErrorState message={pageError} onRetry={loadDashboard} />

  return (
    <div className="mobile-dashboard">
      <div className="mobile-dashboard__greeting">
        <span className="mobile-dashboard__site">{currentSite?.name ?? '현장 미선택'}</span>
        <strong className="mobile-dashboard__hello">안녕하세요, {user?.name ?? ''}님</strong>
        <span className="mobile-dashboard__role">{USER_ROLE_LABELS[role] ?? role}</span>
      </div>

      {/* 상단 요약 카드: 전체/정상/이상/경보 2x2 */}
      <section className="mobile-dashboard-kpi-grid" aria-label="설비 현황 요약">
        {kpiItems.map((item) => (
          <div key={item.label} className="mobile-dashboard-kpi">
            <span className="mobile-dashboard-kpi__label">{item.label}</span>
            <strong className="mobile-dashboard-kpi__value">
              {formatNumber(item.value)}
              <span>{item.unit}</span>
            </strong>
            {item.percent && (
              <span
                className={`mobile-dashboard-kpi__percent mobile-dashboard-kpi__percent--${item.percentStatus.toLowerCase()}`}
              >
                전체 대비 {item.percent}
              </span>
            )}
          </div>
        ))}
      </section>

      {/* 미처리 알림: 확인 또는 조치완료가 필요한 경보만 별도 표시. 바깥 카드 없이 줄마다 흰 배경만 준다 */}
      <section className="mobile-dashboard-section-plain" aria-labelledby="mobile-dashboard-pending-title">
        <div className="mobile-dashboard-section-heading">
          <h2 id="mobile-dashboard-pending-title">
            미처리 알림
            <span className="mobile-dashboard-heading-count"> {formatNumber(pendingTotal)}건</span>
          </h2>
          <button type="button" className="mobile-dashboard-more" onClick={handlePendingMoreClick}>
            더보기 →
          </button>
        </div>

        {pendingError ? (
          <ErrorState message={pendingError} onRetry={loadDashboard} />
        ) : pendingActions.length ? (
          <div className="mobile-dashboard-alert-list">
            {pendingActions.map((alert) => (
              <button
                key={alert.alertId}
                type="button"
                className="mobile-dashboard-alert-row"
                onClick={() => handlePendingAlertClick(alert)}
              >
                <span className="mobile-dashboard-alert-row__top">
                  <strong>{labelOf(ALERT_TYPE_LABELS, alert.type)}</strong>
                  <StatusBadge
                    status={alert.status}
                    label={labelOf(ALERT_STATUS_LABELS, alert.status)}
                    color={colorOf(ALERT_STATUS_COLOR, alert.status)}
                  />
                </span>
                <span className="mobile-dashboard-alert-row__meta">
                  {alert.panelName} · {formatCircuitNo(alert.circuitNo)} · {formatDateTime(alert.triggeredAt)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState message="미처리 알림이 없습니다." description="현재 선택 현장의 미확인·확인 경보가 없습니다." />
        )}
      </section>

      {/* 설비별 위험 등급: 위험도가 높은 분전반 최대 4개 */}
      <section className="mobile-dashboard-section-plain" aria-labelledby="mobile-dashboard-risk-title">
        <div className="mobile-dashboard-section-heading">
          <h2 id="mobile-dashboard-risk-title">설비별 위험 등급</h2>
          <button type="button" className="mobile-dashboard-more" onClick={handleEquipmentMoreClick}>
            더보기 →
          </button>
        </div>

        {riskPanels.length ? (
          <div className="mobile-dashboard-risk-list">
            {riskPanels.map((panel) => (
              <button
                key={panel.panelId}
                type="button"
                className={getRiskCardClassName(panel.status)}
                onClick={() => handlePanelClick(panel)}
              >
                <span className="mobile-dashboard-risk-card__top">
                  <strong>{panel.name ?? '-'}</strong>
                </span>
                <span className="mobile-dashboard-risk-card__row">
                  <span>위험 항목</span>
                  <strong>{formatRiskReason(panel)}</strong>
                </span>
                <span className="mobile-dashboard-risk-card__row">
                  <span>미확인</span>
                  <strong>{formatNumber(panel.unconfirmedAlertCount)}건</strong>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState message="표시할 분전반이 없습니다." description="현재 선택 현장에 조회 가능한 분전반이 없습니다." />
        )}
      </section>
    </div>
  )
}
