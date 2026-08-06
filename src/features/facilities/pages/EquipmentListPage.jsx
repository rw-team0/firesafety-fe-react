import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPanels } from '../api/facilityApi'
import { extractServerMessage, formatDateTimeCell, formatOnline, formatPanelStatus } from '../utils/facilityFormatters'
import { canManageFacilities } from '../utils/facilityPolicy'
import { useAuth } from '@/features/auth/useAuth'
import { useMonitoring } from '@/features/monitoring/useMonitoring'
import { useSite } from '@/features/sites/useSite'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import Pagination from '@/shared/components/data-display/Pagination'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import FilterBar from '@/shared/components/layout/FilterBar'
import { ROUTE_PATHS, buildPath } from '@/shared/constants/routePaths'
import { EQUIPMENT_LIST_PAGE_SIZE } from '../constants/facilityConstants'
import { PANEL_STATUS_OPTIONS } from '../utils/facilityFormatters'
import './FacilityPages.css'

function formatCount(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

// 분전반 카드 상태별 배경/테두리 클래스 지정
function getPanelCardClassName(status) {
  const normalizedStatus = String(status ?? '').toLowerCase()
  return `facility-panel-card facility-panel-card--${normalizedStatus || 'unknown'}`
}

// 설비 모니터링 화면(SCR-501) — 현재 현장의 분전반을 카드 목록으로 보여주고 상세 화면으로 연결한다.
export default function EquipmentListPage() {
  const { role } = useAuth()
  const { currentSiteId } = useSite()
  // 상태별 분전반 수 요약은 MonitoringProvider가 단일 출처 — 여기서 따로 재조회하지 않는다(대시보드와 같은 API-201 재사용)
  const { refreshedAt, summary } = useMonitoring()
  const navigate = useNavigate()
  const panelSeqRef = useRef(0)
  const canManage = canManageFacilities(role)

  const [panels, setPanels] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [panelLoading, setPanelLoading] = useState(true)
  const [panelError, setPanelError] = useState('')

  // 현재 현장 분전반 카드 목록 조회 — 검색어/상태/페이지는 서버가 필터·페이징한다(API-505)
  // silent=true면 WS/폴링 백그라운드 갱신 — 카드 그리드를 비우지 않고 성공한 값만 조용히 교체한다
  const loadPanels = useCallback(
    async ({ silent = false } = {}) => {
      const siteId = currentSiteId
      const seq = panelSeqRef.current + 1
      panelSeqRef.current = seq

      if (!silent) setPanels([])

      if (!siteId) {
        setPanelLoading(false)
        if (!silent) setPanelError('설비 모니터링은 현장 선택 후 이용할 수 있습니다.')
        return
      }

      if (!silent) {
        setPanelLoading(true)
        setPanelError('')
      }
      try {
        const data = await getPanels({
          siteId,
          keyword: keyword.trim() || undefined,
          status: statusFilter || undefined,
          page: page - 1,
          size: EQUIPMENT_LIST_PAGE_SIZE,
        })
        if (panelSeqRef.current !== seq) return
        setPanels(data?.content ?? [])
        setTotalElements(Number(data?.totalElements ?? 0))
        if (!silent) setPanelError('')
      } catch (error) {
        if (panelSeqRef.current !== seq || silent) return
        const status = error?.response?.status
        setPanelError(
          extractServerMessage(
            error,
            status === 403 ? '현재 현장의 설비를 조회할 권한이 없습니다.' : '설비 모니터링 목록을 불러오지 못했습니다.',
          ),
        )
      } finally {
        // silent 여부와 무관하게 "가장 최근에 접수된 응답"이 도착하면 항상 로딩을 끈다.
        // silent 요청이 non-silent 요청을 seq로 추월했을 때도 스피너가 영원히 안 꺼지는 걸 막기 위함.
        if (panelSeqRef.current === seq) setPanelLoading(false)
      }
    },
    [currentSiteId, keyword, statusFilter, page],
  )

  useEffect(() => {
    // 현장이 바뀌면 이전 현장 목록/선택/상세가 잠시라도 남지 않게 비우고 stale 응답을 무시한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPanels()
    return () => {
      panelSeqRef.current += 1
    }
  }, [loadPanels])

  useEffect(() => {
    // MonitoringProvider가 WS/폴링으로 새 신호를 줄 때마다 화면 깜빡임 없이 카드 목록만 조용히 다시 조회(REQ-201)
    // 요약(summary)은 Context 값을 그대로 구독하므로 여기서 별도로 재조회하지 않는다
    if (!refreshedAt) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPanels({ silent: true })
  }, [refreshedAt, loadPanels])

  useEffect(() => {
    // 현장이 바뀌면 검색/상태 필터/페이지도 새 현장 기준으로 초기화한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKeyword('')
    setStatusFilter('')
    setPage(1)
  }, [currentSiteId])

  const actions = useMemo(
    () =>
      canManage ? (
        <Button variant="secondary" onClick={() => navigate(ROUTE_PATHS.settingsFacilities)}>
          설비 관리
        </Button>
      ) : null,
    [canManage, navigate],
  )
  usePageActions(actions)

  // 상단 요약 카드: 대시보드와 같은 API-201 요약을 재사용 — 필터/페이지와 무관하게 현장 전체 기준 집계.
  const summaryItems = useMemo(() => {
    const total = Number(summary?.totalPanelCount ?? 0)
    const normal = Number(summary?.normalPanelCount ?? 0)
    const caution = Number(summary?.cautionPanelCount ?? 0)
    const risk = Number(summary?.riskPanelCount ?? 0)
    const offline = Number(summary?.offlinePanelCount ?? 0)

    return [
      { label: '전체 분전반', value: total, meta: '현재 선택 현장' },
      { label: '정상', value: normal, status: 'NORMAL', meta: '정상 가동', metaTone: 'normal' },
      { label: '주의', value: caution, status: 'CAUTION', meta: '주의 확인 필요', metaTone: 'caution' },
      { label: '위험', value: risk, status: 'RISK', meta: '즉시 확인 필요', metaTone: 'risk' },
      { label: '통신두절', value: offline, status: 'OFFLINE', meta: '통신 상태 확인', metaTone: 'offline' },
    ]
  }, [summary])

  const siteHasPanels = Number(summary?.totalPanelCount ?? 0) > 0
  const totalPages = Math.max(1, Math.ceil(totalElements / EQUIPMENT_LIST_PAGE_SIZE))

  // 분전반 카드 클릭 시 상세 모니터링 페이지로 이동
  const handlePanelClick = useCallback(
    (panel) => {
      if (!panel?.panelId) return
      navigate(buildPath(ROUTE_PATHS.equipmentDetail, { panelId: panel.panelId }))
    },
    [navigate],
  )

  // 분전반 필터 초기화
  const handleResetFilters = useCallback(() => {
    setKeyword('')
    setStatusFilter('')
    setPage(1)
  }, [])

  if (panelError) return <ErrorState message={panelError} onRetry={loadPanels} />

  return (
    <div className="facility-page">
      {/* 상단 요약 카드: 현재 현장의 분전반 상태 분포를 먼저 보여준다. */}
      <section className="facility-monitoring-summary-grid" aria-label="분전반 상태 요약">
        {summaryItems.map((item) => (
          <BaseCard key={item.label} className="facility-monitoring-summary-card">
            <span className="facility-monitoring-summary-card__label">{item.label}</span>
            <strong className="facility-monitoring-summary-card__value">
              {formatCount(item.value)}
              <span>대</span>
            </strong>
            <span
              className={`facility-monitoring-summary-card__meta ${
                item.metaTone ? `facility-monitoring-summary-card__meta--${item.metaTone}` : ''
              }`.trim()}
            >
              {item.meta}
            </span>
          </BaseCard>
        ))}
      </section>

      {panelLoading && <LoadingState label="분전반 목록을 불러오는 중입니다..." />}

      {!panelLoading && !siteHasPanels && <EmptyState message="현재 현장에 등록된 분전반이 없습니다." />}

      {!panelLoading && siteHasPanels && (
        <>
          <BaseCard className="facility-panel-filter-card">
            <FilterBar onReset={handleResetFilters}>
              <Input
                id="equipment-panel-keyword"
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value)
                  setPage(1)
                }}
                placeholder="분전반명 검색"
                aria-label="분전반명 검색"
              />
              <Select
                id="equipment-panel-status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                }}
                placeholder="전체 상태"
                options={PANEL_STATUS_OPTIONS}
                aria-label="상태 필터"
              />
            </FilterBar>
          </BaseCard>

          <BaseCard className="facility-panel-list-card">
            {panels.length === 0 ? (
              <EmptyState message="조건에 맞는 분전반이 없습니다." description="검색어 또는 상태 필터를 조정해주세요." />
            ) : (
              /* 분전반 카드 목록: 색상으로 상태를 훑고, 클릭하면 /equipment/:panelId 상세로 이동한다. */
              <section className="facility-panel-card-grid" aria-label="분전반 목록">
                {panels.map((panel) => (
                  <button
                    key={panel.panelId}
                    type="button"
                    className={getPanelCardClassName(panel.status)}
                    onClick={() => handlePanelClick(panel)}
                  >
                    <span className="facility-panel-card__top">
                      <span>
                        <strong>{panel.name || '-'}</strong>
                        <small>{panel.deviceSerial || '-'}</small>
                      </span>
                      <StatusBadge status={panel.status} label={formatPanelStatus(panel.status)} />
                    </span>
                    <span className="facility-panel-card__details">
                      <span>
                        <b>분전반No</b>
                        <strong>{panel.mNo || '-'}</strong>
                      </span>
                      <span>
                        <b>통신 상태</b>
                        <strong>{formatOnline(panel.isOnline)}</strong>
                      </span>
                      <span>
                        <b>최근 통신</b>
                        <strong>{formatDateTimeCell(panel.lastCommunicatedAt)}</strong>
                      </span>
                    </span>
                  </button>
                ))}
              </section>
            )}
          </BaseCard>

          {totalElements > 0 && (
            <div className="facility-list__footer">
              <p className="facility-list__count">
                총 {formatCount(totalElements)}개 중 {formatCount(panels.length)}개 조회
              </p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
