import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPanels } from '../api/facilityApi'
import { extractServerMessage, formatDateTimeCell, formatOnline, formatPanelStatus } from '../utils/facilityFormatters'
import { canManageFacilities } from '../utils/facilityPolicy'
import { useAuth } from '@/features/auth/useAuth'
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
  const navigate = useNavigate()
  const panelSeqRef = useRef(0)
  const canManage = canManageFacilities(role)

  const [panels, setPanels] = useState([])
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [panelLoading, setPanelLoading] = useState(true)
  const [panelError, setPanelError] = useState('')

  // 현재 현장 분전반 카드 목록 조회
  const loadPanels = useCallback(async () => {
    const siteId = currentSiteId
    const seq = panelSeqRef.current + 1
    panelSeqRef.current = seq

    setPanels([])

    if (!siteId) {
      setPanelLoading(false)
      setPanelError('설비 모니터링은 현장 선택 후 이용할 수 있습니다.')
      return
    }

    setPanelLoading(true)
    setPanelError('')
    try {
      const data = await getPanels({ siteId })
      if (panelSeqRef.current !== seq) return
      const nextPanels = data ?? []
      setPanels(nextPanels)
    } catch (error) {
      if (panelSeqRef.current !== seq) return
      const status = error?.response?.status
      setPanelError(
        extractServerMessage(
          error,
          status === 403 ? '현재 현장의 설비를 조회할 권한이 없습니다.' : '설비 모니터링 목록을 불러오지 못했습니다.',
        ),
      )
    } finally {
      if (panelSeqRef.current === seq) setPanelLoading(false)
    }
  }, [currentSiteId])

  useEffect(() => {
    // 현장이 바뀌면 이전 현장 목록/선택/상세가 잠시라도 남지 않게 비우고 stale 응답을 무시한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPanels()
    return () => {
      panelSeqRef.current += 1
    }
  }, [loadPanels])

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

  // 상단 요약 카드: 목록 API가 주는 status 값만 이용해 현재 현장의 분전반 상태를 집계한다.
  const summaryItems = useMemo(
    () => {
      const total = panels.length
      const normal = panels.filter((panel) => panel.status === 'NORMAL').length
      const caution = panels.filter((panel) => panel.status === 'CAUTION').length
      const risk = panels.filter((panel) => panel.status === 'RISK').length
      const offline = panels.filter((panel) => panel.status === 'OFFLINE').length

      return [
        { label: '전체 분전반', value: total, meta: '현재 선택 현장' },
        { label: '정상', value: normal, status: 'NORMAL', meta: '정상 가동', metaTone: 'normal' },
        { label: '주의', value: caution, status: 'CAUTION', meta: '주의 확인 필요', metaTone: 'caution' },
        { label: '위험', value: risk, status: 'RISK', meta: '즉시 확인 필요', metaTone: 'risk' },
        { label: '통신두절', value: offline, status: 'OFFLINE', meta: '통신 상태 확인', metaTone: 'offline' },
      ]
    },
    [panels],
  )

  // 분전반명/상태 필터 적용
  const filteredPanels = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return panels.filter((panel) => {
      const matchesName = !normalizedKeyword || String(panel.name ?? '').toLowerCase().includes(normalizedKeyword)
      const matchesStatus = !statusFilter || panel.status === statusFilter
      return matchesName && matchesStatus
    })
  }, [keyword, panels, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredPanels.length / EQUIPMENT_LIST_PAGE_SIZE))

  // 현재 페이지 분전반 카드 목록
  const pagedPanels = useMemo(() => {
    const start = (page - 1) * EQUIPMENT_LIST_PAGE_SIZE
    return filteredPanels.slice(start, start + EQUIPMENT_LIST_PAGE_SIZE)
  }, [filteredPanels, page])

  useEffect(() => {
    // 필터 결과가 줄어 현재 페이지가 사라지면 첫 페이지로 되돌린다.
    if (page <= totalPages) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
  }, [page, totalPages])

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

      {!panelLoading && panels.length === 0 && <EmptyState message="현재 현장에 등록된 분전반이 없습니다." />}

      {!panelLoading && panels.length > 0 && (
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
            {filteredPanels.length === 0 ? (
              <EmptyState message="조건에 맞는 분전반이 없습니다." description="검색어 또는 상태 필터를 조정해주세요." />
            ) : (
              /* 분전반 카드 목록: 색상으로 상태를 훑고, 클릭하면 /equipment/:panelId 상세로 이동한다. */
              <section className="facility-panel-card-grid" aria-label="분전반 목록">
                {pagedPanels.map((panel) => (
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

          {filteredPanels.length > 0 && (
            <div className="facility-list__footer">
              <p className="facility-list__count">
                총 {formatCount(filteredPanels.length)}개 중 {formatCount(pagedPanels.length)}개 조회
              </p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
