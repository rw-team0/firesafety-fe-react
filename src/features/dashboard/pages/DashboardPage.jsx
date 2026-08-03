import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPendingAlerts, getAlerts } from '@/features/alerts/api/alertApi'
import { useSite } from '@/features/sites/useSite'
import { getDashboardSummary } from '../api/dashboardApi'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import DataTable from '@/shared/components/data-display/DataTable'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import { ALERT_STATUS_LABELS, ALERT_TYPE_LABELS, labelOf } from '@/shared/constants/domainLabels'
import { ALERT_STATUS_COLOR, colorOf } from '@/shared/constants/domainColors'
import { ROUTE_PATHS, buildPath } from '@/shared/constants/routePaths'
import { extractErrorMessage } from '@/shared/api/apiError'
import { formatDateTime } from '@/shared/utils/formatters'
import './DashboardPage.css'

const RECENT_ALERT_SIZE = 5
const PENDING_ACTION_SIZE = 5
const RISK_PANEL_LIMIT = 5

// 대시보드 요약 API 실패/빈 응답 시 화면 계산이 깨지지 않도록 쓰는 기본값
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

// Page 응답에서 목록(content)만 안전하게 꺼내기
function toPageContent(data) {
  return Array.isArray(data?.content) ? data.content : []
}

// 대시보드 숫자 표기 통일
function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

// 전체 설비 대비 비율 계산
function formatPercent(value, total) {
  const denominator = Number(total ?? 0)
  if (!denominator) return '0.0%'
  return `${((Number(value ?? 0) / denominator) * 100).toFixed(1)}%`
}

// 회로 번호 표시, 회로 정보가 없는 경보는 '-'로 표시
function formatCircuitNo(value) {
  return value ? `${value}번` : '-'
}

// 경보 처리상태 enum을 공통 상태 배지로 표시
function renderAlertStatus(status) {
  return (
    <StatusBadge
      status={status}
      label={labelOf(ALERT_STATUS_LABELS, status)}
      color={colorOf(ALERT_STATUS_COLOR, status)}
    />
  )
}

// 위험 설비 카드 상태별 배경/테두리 클래스 지정
function getRiskCardClassName(status) {
  const normalizedStatus = String(status ?? '').toLowerCase()
  return `dashboard-risk-card dashboard-risk-card--${normalizedStatus || 'unknown'}`
}

// 위험 설비 카드의 위험 항목 표시, 요약 API가 주는 상태값만 사용
function formatRiskReason(panel) {
  const statusReasonMap = {
    NORMAL: '정상 상태',
    CAUTION: '주의 상태',
    RISK: '위험 상태',
    OFFLINE: '통신두절',
  }
  return statusReasonMap[panel?.status] ?? '상태 확인 필요'
}

// SCR-201 대시보드 — 현재 선택 현장의 설비/경보 요약을 조회한다.
export default function DashboardPage() {
  const { currentSiteId } = useSite()
  const navigate = useNavigate()
  const requestSeqRef = useRef(0)

  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [recentAlerts, setRecentAlerts] = useState([])
  const [pendingActions, setPendingActions] = useState([])
  const [pendingTotal, setPendingTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [summaryError, setSummaryError] = useState('')
  const [recentError, setRecentError] = useState('')
  const [pendingError, setPendingError] = useState('')

  // 현재 현장 대시보드 데이터 조회
  const loadDashboard = useCallback(async () => {
    const siteId = currentSiteId
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq

    // 현장이 바뀌거나 재조회할 때 이전 현장 데이터가 잠깐 남지 않도록 먼저 비운다.
    setSummary(EMPTY_SUMMARY)
    setRecentAlerts([])
    setPendingActions([])
    setPendingTotal(0)
    setRecentError('')
    setPendingError('')

    if (!siteId) {
      setLoading(false)
      setSummaryError('대시보드는 현장 선택 후 이용할 수 있습니다.')
      return
    }

    setLoading(true)
    setSummaryError('')

    // 요약/최근경보/미처리조치는 서로 독립 영역이라 일부 실패해도 나머지 영역은 표시한다.
    const [summaryResult, recentResult, pendingResult] = await Promise.allSettled([
      getDashboardSummary({ siteId }),
      getAlerts({ siteId, page: 0, size: RECENT_ALERT_SIZE }),
      getPendingAlerts({ siteId, page: 0, size: PENDING_ACTION_SIZE }),
    ])

    // currentSite 변경 등으로 더 최신 요청이 있으면 오래된 응답은 화면에 반영하지 않는다.
    if (requestSeqRef.current !== seq) return

    // 설비 상태 요약과 위험 설비 목록 반영
    if (summaryResult.status === 'fulfilled') {
      setSummary({ ...EMPTY_SUMMARY, ...(summaryResult.value ?? {}) })
    } else {
      setSummaryError(extractErrorMessage(summaryResult.reason, '대시보드 요약을 불러오지 못했습니다.'))
    }

    // 최근 이벤트 목록 반영
    if (recentResult.status === 'fulfilled') {
      setRecentAlerts(toPageContent(recentResult.value))
    } else {
      setRecentError(extractErrorMessage(recentResult.reason, '최근 알림을 불러오지 못했습니다.'))
    }

    // 미확인/확인 상태의 미처리 조치 목록 반영
    if (pendingResult.status === 'fulfilled') {
      setPendingActions(toPageContent(pendingResult.value))
      setPendingTotal(Number(pendingResult.value?.totalElements ?? 0))
    } else {
      setPendingError(extractErrorMessage(pendingResult.reason, '미처리 조치 목록을 불러오지 못했습니다.'))
    }

    setLoading(false)
  }, [currentSiteId])

  useEffect(() => {
    // 현장 변경 시 이전 현장 데이터가 남지 않도록 초기화하고, 늦게 도착한 응답은 무시한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard()
    return () => {
      requestSeqRef.current += 1
    }
  }, [loadDashboard])

  // 상단 핵심 요약 카드 목록 구성
  const kpiItems = useMemo(
    () => {
      const total = Number(summary.totalPanelCount ?? 0)
      const normal = Number(summary.normalPanelCount ?? 0)
      const caution = Number(summary.cautionPanelCount ?? 0)
      const risk = Number(summary.riskPanelCount ?? 0)
      const offline = Number(summary.offlinePanelCount ?? 0)
      const abnormal = caution + risk + offline
      const unresolvedAlerts = Number(summary.unresolvedAlertCount ?? 0)
      const unconfirmedAlerts = Number(summary.unconfirmedAlertCount ?? 0)

      return [
        {
          label: '전체 설비',
          value: total,
          unit: '대',
          meta: `정상 ${formatNumber(normal)} · 이상 ${formatNumber(abnormal)}`,
        },
        {
          label: '정상 가동',
          value: normal,
          unit: '대',
          percent: formatPercent(normal, total),
          percentStatus: 'NORMAL',
          meta: '전체 설비 대비 정상 비율',
        },
        {
          label: '이상 감지',
          value: abnormal,
          unit: '대',
          percent: formatPercent(abnormal, total),
          percentStatus: 'CAUTION',
          meta: `주의 ${formatNumber(caution)} · 위험 ${formatNumber(risk)} · 통신두절 ${formatNumber(offline)}`,
        },
        {
          label: '경보 발생',
          value: unresolvedAlerts,
          unit: '건',
          percent: formatPercent(unresolvedAlerts, total),
          percentStatus: 'RISK',
          meta: `미확인 ${formatNumber(unconfirmedAlerts)} · 미처리 ${formatNumber(pendingTotal)}건`,
        },
      ]
    },
    [pendingTotal, summary],
  )

  // 백엔드가 위험도 우선 정렬로 내려준 분전반 목록 중 대시보드 표시 개수만 사용
  const riskPanels = useMemo(() => (summary.panels ?? []).slice(0, RISK_PANEL_LIMIT), [summary.panels])

  // 최근 알림 테이블 컬럼 정의
  const recentAlertColumns = useMemo(
    () => [
      { key: 'type', header: '알림 유형', render: (row) => labelOf(ALERT_TYPE_LABELS, row.type) },
      { key: 'status', header: '상태', render: (row) => renderAlertStatus(row.status) },
      { key: 'panelName', header: '분전반' },
      { key: 'circuitNo', header: '회로', render: (row) => formatCircuitNo(row.circuitNo) },
      { key: 'triggeredAt', header: '발생 시각', render: (row) => formatDateTime(row.triggeredAt) },
    ],
    [],
  )

  // 미처리 조치 테이블 컬럼 정의
  const pendingActionColumns = useMemo(
    () => [
      { key: 'type', header: '조치 대상', render: (row) => labelOf(ALERT_TYPE_LABELS, row.type) },
      { key: 'status', header: '상태', render: (row) => renderAlertStatus(row.status) },
      { key: 'panelName', header: '분전반' },
      { key: 'elapsedHours', header: '경과 시간', render: (row) => `${formatNumber(row.elapsedHours)}시간` },
      { key: 'triggeredAt', header: '발생 시각', render: (row) => formatDateTime(row.triggeredAt) },
    ],
    [],
  )

  // 설비 상세 모니터링 이동
  const handlePanelClick = useCallback(
    (panel) => {
      if (!panel?.panelId) return
      navigate(buildPath(ROUTE_PATHS.equipmentDetail, { panelId: panel.panelId }))
    },
    [navigate],
  )

  // 경보 목록 이동
  const handleAlertClick = useCallback(
    (alert) => {
      if (!alert?.alertId) return
      navigate(`${ROUTE_PATHS.alerts}?alertId=${encodeURIComponent(alert.alertId)}`)
    },
    [navigate],
  )

  // 설비 모니터링 목록 이동
  const handleEquipmentClick = useCallback(() => {
    navigate(ROUTE_PATHS.equipmentList)
  }, [navigate])

  // 알림 이력 목록 이동
  const handleAlertsClick = useCallback(() => {
    navigate(ROUTE_PATHS.alerts)
  }, [navigate])

  if (loading) return <LoadingState label="대시보드 데이터를 불러오는 중입니다..." />

  if (summaryError) return <ErrorState message={summaryError} onRetry={loadDashboard} />

  return (
    <div className="dashboard-page">
      {/* 상단 KPI 카드: 전체/정상/이상/경보를 전체 설비 대비 비율과 함께 표시 */}
      <section className="dashboard-kpi-grid" aria-label="설비 현황 요약">
        {kpiItems.map((item) => (
          <BaseCard key={item.label} className="dashboard-kpi">
            <div className="dashboard-kpi__top">
              <span className="dashboard-kpi__label">{item.label}</span>
              {item.percent && (
                <span className={`dashboard-kpi__percent dashboard-kpi__percent--${item.percentStatus.toLowerCase()}`}>
                  {item.percent}
                </span>
              )}
            </div>
            <strong className="dashboard-kpi__value">
              {formatNumber(item.value)}
              <span>{item.unit}</span>
            </strong>
            <span className="dashboard-kpi__meta">{item.meta}</span>
          </BaseCard>
        ))}
      </section>

      <div className="dashboard-main-grid">
        {/* 최근 알림: 현재 현장의 최신 경보를 알림 이력 화면으로 연결 */}
        <BaseCard
          className="dashboard-section"
          header={
            <>
              <div>
                <h2>최근 알림</h2>
              </div>
              <Button variant="ghost" onClick={handleAlertsClick}>
                전체 보기 →
              </Button>
            </>
          }
        >
          {recentError ? (
            <ErrorState message={recentError} onRetry={loadDashboard} />
          ) : (
            <DataTable
              columns={recentAlertColumns}
              rows={recentAlerts}
              rowKey={(row) => row.alertId}
              emptyMessage="최근 알림이 없습니다."
              emptyDescription="현재 선택 현장에 표시할 경보가 없습니다."
              onRowClick={handleAlertClick}
            />
          )}
        </BaseCard>

        {/* 미처리 이력: 확인 또는 조치완료가 필요한 경보만 별도 표시 */}
        <BaseCard
          className="dashboard-section"
          header={
            <>
              <div>
                <h2>
                  미처리 이력
                  <span className="dashboard-heading-count"> / {formatNumber(pendingTotal)}건</span>
                </h2>
              </div>
              <Button variant="ghost" onClick={handleAlertsClick}>
                전체 보기 →
              </Button>
            </>
          }
        >
          {pendingError ? (
            <ErrorState message={pendingError} onRetry={loadDashboard} />
          ) : pendingActions.length ? (
            <DataTable
              columns={pendingActionColumns}
              rows={pendingActions}
              rowKey={(row) => row.alertId}
              emptyMessage="미처리 조치가 없습니다."
              onRowClick={handleAlertClick}
            />
          ) : (
            <EmptyState message="미처리 조치가 없습니다." description="현재 선택 현장의 미확인·확인 경보가 없습니다." />
          )}
        </BaseCard>
      </div>

      {/* 설비별 위험 등급: 위험도가 높은 분전반을 카드로 표시하고 상세 모니터링으로 이동 */}
      <section className="dashboard-risk-section" aria-labelledby="dashboard-risk-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="dashboard-risk-title">설비별 위험 등급</h2>
          </div>
          <Button variant="ghost" onClick={handleEquipmentClick}>
            모니터링 →
          </Button>
        </div>

        {riskPanels.length ? (
          <div className="dashboard-risk-grid">
            {riskPanels.map((panel) => (
              <button
                key={panel.panelId}
                type="button"
                className={getRiskCardClassName(panel.status)}
                onClick={() => handlePanelClick(panel)}
              >
                <span className="dashboard-risk-card__top">
                  <strong>{panel.name ?? '-'}</strong>
                </span>
                <span className="dashboard-risk-card__row">
                  <span>위험 항목</span>
                  <strong>{formatRiskReason(panel)}</strong>
                </span>
                <span className="dashboard-risk-card__row">
                  <span>마지막 통신</span>
                  <strong>{formatDateTime(panel.lastCommunicatedAt)}</strong>
                </span>
                <span className="dashboard-risk-card__row">
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
