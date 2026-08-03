import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { confirmAlert, exportAlerts, getAlerts, getPendingAlerts, resolveAlert } from '../api/alertApi'
import {
  ALERT_STATUS_OPTIONS,
  ALERT_TYPE_OPTIONS,
  PENDING_STATUS_OPTIONS,
  extractServerMessage,
  formatAlertStatus,
  formatAlertType,
  formatCircuitNo,
  formatDateTimeCell,
  summarizeSettledResults,
} from '../utils/alertFormatters'
import { useAuth } from '@/features/auth/useAuth'
import { useMonitoring } from '@/features/monitoring/useMonitoring'
import { useSite } from '@/features/sites/useSite'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import BaseCard from '@/shared/components/data-display/BaseCard'
import DataTable from '@/shared/components/data-display/DataTable'
import Pagination from '@/shared/components/data-display/Pagination'
import Button from '@/shared/components/buttons/Button'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import FilterBar from '@/shared/components/layout/FilterBar'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import BaseModal from '@/shared/components/modals/BaseModal'
import { isoDate, formatResultDateTime } from '@/shared/utils/formatters'
import './AlertHistoryPage.css'

const VALID_TABS = ['all', 'pending']
const PAGE_SIZE = 11 // FUNC-301-05는 13건이지만 화면 스크롤이 생겨 다른 목록 화면과 동일하게 11건으로 맞춘다
const RESOLUTION_NOTE_MAX_LENGTH = 500
const OVERDUE_HOURS = 24 // FUNC-301-12 지연 배지 기준

function formatCount(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

function defaultFromDate() {
  const date = new Date()
  date.setDate(date.getDate() - 7) // FUNC-301-02: 기본 최근 7일
  return isoDate(date)
}

// SCR-301 알림 이력 — 전체 이력(API-301)과 미처리 조치(API-306) 두 탭으로 나눈다.
export default function AlertHistoryPage() {
  const { user } = useAuth()
  const { currentSiteId } = useSite()
  const { refreshedAt } = useMonitoring()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'all'
  const dashboardAlertId = searchParams.get('alertId')

  // 전체 이력(API-301) 상태
  const [alerts, setAlerts] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState(defaultFromDate)
  const [to, setTo] = useState(() => isoDate(new Date()))
  const [page, setPage] = useState(1)
  const listSeqRef = useRef(0)

  // 미처리 조치(API-306) 상태
  const [pendingAlerts, setPendingAlerts] = useState([])
  const [pendingTotalElements, setPendingTotalElements] = useState(0)
  const [pendingLoading, setPendingLoading] = useState(true)
  const [pendingError, setPendingError] = useState('')
  const [pendingPage, setPendingPage] = useState(1)
  const [selectedPendingIds, setSelectedPendingIds] = useState([])
  const [pendingKeyword, setPendingKeyword] = useState('')
  const [pendingStatus, setPendingStatus] = useState('')
  const pendingSeqRef = useRef(0)

  const [detailTarget, setDetailTarget] = useState(null)
  const [actionTarget, setActionTarget] = useState(null) // { alert, mode: 'confirm' | 'resolve' }
  const [resolutionNote, setResolutionNote] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionResult, setActionResult] = useState(null)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkResolveOpen, setBulkResolveOpen] = useState(false)
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false)

  // 전체 이력 조회
  const loadAlerts = useCallback(
    async ({ silent = false } = {}) => {
      const siteId = currentSiteId
      const seq = listSeqRef.current + 1
      listSeqRef.current = seq

      if (!silent) setAlerts([])
      if (!siteId) {
        setLoading(false)
        if (!silent) setLoadError('알림 이력은 현장 선택 후 이용할 수 있습니다.')
        return
      }
      if (!silent) {
        setLoading(true)
        setLoadError('')
      }
      try {
        const data = await getAlerts({
          siteId,
          type: type || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
          page: page - 1,
          size: PAGE_SIZE,
        })
        if (listSeqRef.current !== seq) return
        setAlerts(data?.content ?? [])
        setTotalElements(Number(data?.totalElements ?? 0))
        if (!silent) setLoadError('')
      } catch (error) {
        if (listSeqRef.current !== seq || silent) return
        setLoadError(extractServerMessage(error, '알림 이력을 불러오지 못했습니다.'))
      } finally {
        if (listSeqRef.current === seq) setLoading(false)
      }
    },
    [currentSiteId, type, status, from, to, page],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAlerts()
    return () => {
      listSeqRef.current += 1
    }
  }, [loadAlerts])

  useEffect(() => {
    // MonitoringProvider가 WS/폴링으로 새 신호를 줄 때마다 조용히 다시 조회
    if (!refreshedAt || activeTab !== 'all') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAlerts({ silent: true })
  }, [refreshedAt, activeTab, loadAlerts])

  // 미처리 조치 조회
  const loadPendingAlerts = useCallback(
    async ({ silent = false } = {}) => {
      const siteId = currentSiteId
      const seq = pendingSeqRef.current + 1
      pendingSeqRef.current = seq

      if (!silent) setPendingAlerts([])
      if (!siteId) {
        setPendingLoading(false)
        return
      }
      if (!silent) {
        setPendingLoading(true)
        setPendingError('')
      }
      try {
        const data = await getPendingAlerts({ siteId, page: pendingPage - 1, size: PAGE_SIZE })
        if (pendingSeqRef.current !== seq) return
        setPendingAlerts(data?.content ?? [])
        setPendingTotalElements(Number(data?.totalElements ?? 0))
        if (!silent) setPendingError('')
      } catch (error) {
        if (pendingSeqRef.current !== seq || silent) return
        setPendingError(extractServerMessage(error, '미처리 조치 목록을 불러오지 못했습니다.'))
      } finally {
        if (pendingSeqRef.current === seq) setPendingLoading(false)
      }
    },
    [currentSiteId, pendingPage],
  )

  useEffect(() => {
    if (activeTab !== 'pending') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPendingAlerts()
    return () => {
      pendingSeqRef.current += 1
    }
  }, [activeTab, loadPendingAlerts])

  useEffect(() => {
    if (!refreshedAt || activeTab !== 'pending') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPendingAlerts({ silent: true })
  }, [refreshedAt, activeTab, loadPendingAlerts])

  useEffect(() => {
    // 현장이 바뀌면 필터/선택/페이지를 새 현장 기준으로 초기화한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKeyword('')
    setType('')
    setStatus('')
    setPage(1)
    setPendingPage(1)
    setPendingKeyword('')
    setPendingStatus('')
    setSelectedPendingIds([])
  }, [currentSiteId])

  // 대시보드에서 특정 알림 클릭으로 들어온 경우, 이번에 불러온 페이지 안에 있으면 상세를 자동으로 연다
  useEffect(() => {
    if (!dashboardAlertId || loading) return
    const matched = alerts.find((alert) => String(alert.alertId) === dashboardAlertId)
    if (matched) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetailTarget(matched)
      const params = new URLSearchParams(searchParams)
      params.delete('alertId')
      setSearchParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardAlertId, loading, alerts])

  // 대시보드 미처리 이력에서 클릭으로 들어온 경우 — 미처리 조치 탭 행 클릭과 동일하게 상태에 맞는 확인/조치완료 모달을 연다
  useEffect(() => {
    if (!dashboardAlertId || activeTab !== 'pending' || pendingLoading) return
    const matched = pendingAlerts.find((alert) => String(alert.alertId) === dashboardAlertId)
    if (matched) {
      handlePendingRowClick(matched)
      const params = new URLSearchParams(searchParams)
      params.delete('alertId')
      setSearchParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardAlertId, activeTab, pendingLoading, pendingAlerts])

  // FUNC-301-01: 분전반 키워드는 서버 파라미터가 없어 현재 페이지 안에서만 클라이언트 필터링한다(유형은 이미 드롭다운 필터가 있어 중복 제외)
  const filteredAlerts = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized) return alerts
    return alerts.filter((alert) => String(alert.panelName ?? '').toLowerCase().includes(normalized))
  }, [alerts, keyword])

  // 미처리 조치 탭도 같은 방식(분전반 키워드 + 상태)으로 현재 페이지 안에서 클라이언트 필터링한다
  const filteredPendingAlerts = useMemo(() => {
    const normalized = pendingKeyword.trim().toLowerCase()
    return pendingAlerts.filter((alert) => {
      const matchesKeyword = !normalized || String(alert.panelName ?? '').toLowerCase().includes(normalized)
      const matchesStatus = !pendingStatus || alert.status === pendingStatus
      return matchesKeyword && matchesStatus
    })
  }, [pendingAlerts, pendingKeyword, pendingStatus])

  function switchTab(tab) {
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    params.delete('alertId')
    setSearchParams(params)
  }

  function togglePendingSelect(alertId) {
    setSelectedPendingIds((prev) => (prev.includes(alertId) ? prev.filter((id) => id !== alertId) : [...prev, alertId]))
  }

  function togglePendingSelectAll() {
    const pageIds = filteredPendingAlerts.map((alert) => alert.alertId)
    const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedPendingIds.includes(id))
    setSelectedPendingIds((prev) =>
      allChecked ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])],
    )
  }

  function handleResetFilters() {
    setKeyword('')
    setType('')
    setStatus('')
    setFrom(defaultFromDate())
    setTo(isoDate(new Date()))
    setPage(1)
  }

  // 단건 확인/조치완료
  async function handleActionConfirm() {
    setActionError('')
    try {
      if (actionTarget.mode === 'confirm') {
        await confirmAlert(actionTarget.alert.alertId)
        setActionResult({
          title: '확인 처리되었습니다.',
          infoRows: [
            { label: '확인 항목', value: formatAlertType(actionTarget.alert.type) },
            { label: '확인 시각', value: formatResultDateTime() },
            { label: '확인자', value: user?.name ?? '-' },
          ],
        })
      } else {
        await resolveAlert(actionTarget.alert.alertId, resolutionNote.trim())
        setActionResult({
          title: '조치완료 처리되었습니다.',
          infoRows: [
            { label: '조치 항목', value: formatAlertType(actionTarget.alert.type) },
            { label: '조치 시각', value: formatResultDateTime() },
            { label: '조치자', value: user?.name ?? '-' },
          ],
        })
      }
      setActionTarget(null)
      setResolutionNote('')
      setDetailTarget(null)
      loadAlerts()
      if (activeTab === 'pending') loadPendingAlerts()
    } catch (error) {
      setActionError(extractServerMessage(error, '처리에 실패했습니다.'))
    }
  }

  // 전체 이력 상세 모달의 확인/조치완료 버튼 — 상세는 닫고, 나머지 화면과 동일한 "정말요?" 확인 모달 루트로 넘긴다
  function handleDetailActionRequest(mode) {
    setDetailTarget(null)
    setActionTarget({ alert: detailTarget, mode })
  }

  // 일괄 확인/조치처리는 미처리 조치 탭 전용
  const activeAlerts = filteredPendingAlerts
  const activeSelectedIds = selectedPendingIds
  const clearActiveSelection = () => setSelectedPendingIds([])
  const reloadActiveTab = useCallback(() => {
    loadAlerts()
    loadPendingAlerts()
  }, [loadAlerts, loadPendingAlerts])

  // 선택 일괄 확인 — UNCONFIRMED가 아닌 항목은 건너뛴다(FUNC-301-10)
  async function handleBulkConfirm() {
    const targets = activeAlerts.filter((alert) => activeSelectedIds.includes(alert.alertId) && alert.status === 'UNCONFIRMED')
    setBulkConfirmOpen(false)
    if (!targets.length) return
    const results = await Promise.allSettled(targets.map((alert) => confirmAlert(alert.alertId)))
    const { successCount, failCount, failureReason } = summarizeSettledResults(results)
    setActionResult({
      title: failCount ? `선택한 항목 중 ${successCount}건이 확인 처리되었습니다.` : `선택한 ${successCount}건이 확인 처리되었습니다.`,
      infoRows: [
        { label: '처리 결과', value: `성공 ${successCount}건${failCount ? `, 실패 ${failCount}건` : ''}` },
        ...(failureReason ? [{ label: '실패 사유', value: failureReason }] : []),
        { label: '처리 시각', value: formatResultDateTime() },
        { label: '확인자', value: user?.name ?? '-' },
      ],
    })
    clearActiveSelection()
    reloadActiveTab()
  }

  // 선택 일괄 조치완료 — CONFIRMED가 아닌 항목은 건너뛴다(FUNC-301-10)
  async function handleBulkResolve() {
    const targets = activeAlerts.filter((alert) => activeSelectedIds.includes(alert.alertId) && alert.status === 'CONFIRMED')
    setBulkResolveOpen(false)
    if (!targets.length) return
    const results = await Promise.allSettled(targets.map((alert) => resolveAlert(alert.alertId)))
    const { successCount, failCount, failureReason } = summarizeSettledResults(results)
    setActionResult({
      title: failCount ? `선택한 항목 중 ${successCount}건이 조치완료 처리되었습니다.` : `선택한 ${successCount}건이 조치완료 처리되었습니다.`,
      infoRows: [
        { label: '처리 결과', value: `성공 ${successCount}건${failCount ? `, 실패 ${failCount}건` : ''}` },
        ...(failureReason ? [{ label: '실패 사유', value: failureReason }] : []),
        { label: '처리 시각', value: formatResultDateTime() },
        { label: '조치자', value: user?.name ?? '-' },
      ],
    })
    clearActiveSelection()
    reloadActiveTab()
  }

  // 경보 이력 엑셀 다운로드(FUNC-301-11) — 목록 조회와 같은 필터(전체 이력 탭 필터바 기준)
  async function handleExport() {
    setExportConfirmOpen(false)
    const params = {
      siteId: currentSiteId,
      type: type || undefined,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
    }
    const blob = await exportAlerts(params)
    const url = URL.createObjectURL(blob)
    const today = isoDate(new Date())
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `알림이력_${today}.xlsx`
    anchor.click()
    URL.revokeObjectURL(url)
    // 브라우저 저장 대화상자가 실제로 언제 닫히는지는 JS로 감지 불가능해서, 다운로드 완료 팝업은 따로 안 띄운다(브라우저 자체 다운로드바가 피드백 역할)
  }

  const selectedConfirmableCount = activeSelectedIds.filter((id) =>
    activeAlerts.some((alert) => alert.alertId === id && alert.status === 'UNCONFIRMED'),
  ).length
  const selectedResolvableCount = activeSelectedIds.filter((id) =>
    activeAlerts.some((alert) => alert.alertId === id && alert.status === 'CONFIRMED'),
  ).length

  // 전체 이력 탭 행 클릭 — 상태와 무관하게 항상 상세 모달을 연다(미확인/확인 상태면 그 안에서 바로 처리도 가능)
  function handleHistoryRowClick(alert) {
    setResolutionNote('')
    setActionError('')
    setDetailTarget(alert)
  }

  // 미처리 조치 탭 행 클릭 — 이 탭은 실제로 처리하는 큐라서 상태에 맞는 확인/조치완료 모달을 연다
  function handlePendingRowClick(alert) {
    if (alert.status === 'RESOLVED') {
      setDetailTarget(alert)
      return
    }
    setActionTarget({ alert, mode: alert.status === 'UNCONFIRMED' ? 'confirm' : 'resolve' })
  }

  const columns = useMemo(
    () => [
      {
        key: 'no',
        header: '번호',
        className: 'alert-history__no-cell',
        render: (row, index) => (page - 1) * PAGE_SIZE + index + 1,
      },
      { key: 'triggeredAt', header: '발생일시', render: (row) => formatDateTimeCell(row.triggeredAt) },
      { key: 'panelName', header: '분전반', render: (row) => row.panelName ?? '-' },
      { key: 'circuitNo', header: '회로', render: (row) => formatCircuitNo(row.circuitNo) },
      { key: 'type', header: '유형', render: (row) => formatAlertType(row.type) },
      {
        key: 'status',
        header: '처리상태',
        render: (row) => <StatusBadge status={row.status} label={formatAlertStatus(row.status)} />,
      },
      {
        key: 'processedBy',
        header: '처리자',
        render: (row) => (row.status === 'RESOLVED' ? row.resolvedByName : row.status === 'CONFIRMED' ? row.confirmedByName : '-') ?? '-',
      },
    ],
    [page],
  )

  const pendingColumns = useMemo(
    () => [
      { key: 'triggeredAt', header: '발생일시', render: (row) => formatDateTimeCell(row.triggeredAt) },
      { key: 'panelName', header: '분전반', render: (row) => row.panelName ?? '-' },
      { key: 'type', header: '유형', render: (row) => formatAlertType(row.type) },
      {
        key: 'status',
        header: '처리상태',
        render: (row) => <StatusBadge status={row.status} label={formatAlertStatus(row.status)} />,
      },
      {
        key: 'elapsedHours',
        header: '경과 시간',
        render: (row) => (
          <span className={Number(row.elapsedHours) >= OVERDUE_HOURS ? 'alert-history__overdue' : undefined}>
            {formatCount(row.elapsedHours)}시간{Number(row.elapsedHours) >= OVERDUE_HOURS ? ' · 지연' : ''}
          </span>
        ),
      },
    ],
    [],
  )

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))
  const pendingTotalPages = Math.max(1, Math.ceil(pendingTotalElements / PAGE_SIZE))

  // 전체 이력 탭 = 엑셀 다운로드(하나씩 상세에서 보고 처리), 미처리 조치 탭 = 일괄 확인/조치처리
  const headerActions = useMemo(() => {
    if (activeTab === 'all') {
      return (
        <Button variant="primary" onClick={() => setExportConfirmOpen(true)}>
          엑셀다운로드
        </Button>
      )
    }
    return (
      <>
        <Button variant="secondary" disabled={selectedConfirmableCount === 0} onClick={() => setBulkConfirmOpen(true)}>
          확인처리 ({selectedConfirmableCount})
        </Button>
        <Button variant="primary" disabled={selectedResolvableCount === 0} onClick={() => setBulkResolveOpen(true)}>
          조치처리 ({selectedResolvableCount})
        </Button>
      </>
    )
  }, [activeTab, selectedConfirmableCount, selectedResolvableCount])
  usePageActions(headerActions)

  return (
    <div className="alert-history">
      <BaseCard className="card--filter">
        <nav className="tab-bar" aria-label="알림 이력 화면 전환" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`tab-bar__tab ${activeTab === 'all' ? 'is-active' : ''}`.trim()}
            onClick={() => switchTab('all')}
          >
            전체 이력
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pending'}
            className={`tab-bar__tab ${activeTab === 'pending' ? 'is-active' : ''}`.trim()}
            onClick={() => switchTab('pending')}
          >
            미처리 조치{pendingTotalElements > 0 ? ` (${formatCount(pendingTotalElements)})` : ''}
          </button>
        </nav>

        {activeTab === 'all' && (
          <FilterBar onReset={handleResetFilters}>
            <Input
              aria-label="분전반 검색"
              placeholder="분전반 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Input
              type="date"
              aria-label="시작일"
              className="alert-history__date-input"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                setPage(1)
              }}
            />
            <span className="alert-history__date-separator" aria-hidden="true">~</span>
            <Input
              type="date"
              aria-label="종료일"
              className="alert-history__date-input"
              value={to}
              onChange={(event) => {
                setTo(event.target.value)
                setPage(1)
              }}
            />
            <Select
              aria-label="유형"
              placeholder="전체 유형"
              value={type}
              onChange={(event) => {
                setType(event.target.value)
                setPage(1)
              }}
              options={ALERT_TYPE_OPTIONS}
            />
            <Select
              aria-label="처리상태"
              placeholder="전체 상태"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              options={ALERT_STATUS_OPTIONS}
            />
          </FilterBar>
        )}

        {activeTab === 'pending' && (
          <FilterBar
            onReset={() => {
              setPendingKeyword('')
              setPendingStatus('')
            }}
          >
            <Input
              aria-label="분전반 검색"
              placeholder="분전반 검색"
              value={pendingKeyword}
              onChange={(event) => setPendingKeyword(event.target.value)}
            />
            <Select
              aria-label="처리상태"
              placeholder="전체 상태"
              value={pendingStatus}
              onChange={(event) => setPendingStatus(event.target.value)}
              options={PENDING_STATUS_OPTIONS}
            />
          </FilterBar>
        )}
      </BaseCard>

      {activeTab === 'all' && (
        <div className="alert-history__body">
          {loadError ? (
            <ErrorState message={loadError} onRetry={loadAlerts} />
          ) : (
            <>
              <DataTable
                loading={loading}
                rows={filteredAlerts}
                rowKey={(row) => row.alertId}
                onRowClick={handleHistoryRowClick}
                emptyMessage="조회된 알림이 없습니다."
                emptyDescription="검색어 또는 필터 조건을 조정해주세요."
                columns={columns}
              />
              {!loading && totalElements > 0 && (
                <div className="alert-history__footer">
                  <p className="alert-history__count">총 {formatCount(totalElements)}건 중 {filteredAlerts.length}건 조회</p>
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="alert-history__body">
          {pendingError ? (
            <ErrorState message={pendingError} onRetry={loadPendingAlerts} />
          ) : pendingTotalElements === 0 && !pendingLoading ? (
            <EmptyState message="미처리 조치가 없습니다." description="현재 선택 현장의 미확인·확인 경보가 없습니다." />
          ) : (
            <>
              <DataTable
                loading={pendingLoading}
                rows={filteredPendingAlerts}
                rowKey={(row) => row.alertId}
                onRowClick={handlePendingRowClick}
                selection={{
                  selectedKeys: selectedPendingIds,
                  allSelected: filteredPendingAlerts.length > 0 && filteredPendingAlerts.every((a) => selectedPendingIds.includes(a.alertId)),
                  onToggle: togglePendingSelect,
                  onToggleAll: togglePendingSelectAll,
                }}
                emptyMessage="조건에 맞는 미처리 조치가 없습니다."
                emptyDescription="검색어 또는 상태 필터를 조정해주세요."
                columns={pendingColumns}
              />
              {!pendingLoading && pendingTotalElements > 0 && (
                <div className="alert-history__footer">
                  <p className="alert-history__count">총 {formatCount(pendingTotalElements)}건</p>
                  <Pagination page={pendingPage} totalPages={pendingTotalPages} onChange={setPendingPage} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 단건 확인/조치완료 */}
      {actionTarget && (
        <ConfirmModal
          visible={Boolean(actionTarget)}
          title={actionTarget.mode === 'confirm' ? '경보 확인' : '조치완료 처리'}
          message={
            actionTarget.mode === 'confirm'
              ? `${formatAlertType(actionTarget.alert.type)} 경보를 확인하시겠습니까?`
              : `${formatAlertType(actionTarget.alert.type)} 경보를 조치완료 처리하시겠습니까?`
          }
          confirmLabel={actionTarget.mode === 'confirm' ? '확인' : '조치완료'}
          onCancel={() => {
            setActionTarget(null)
            setResolutionNote('')
            setActionError('')
          }}
          onConfirm={handleActionConfirm}
        >
          {actionError && (
            <p className="banner banner-danger" role="alert">
              {actionError}
            </p>
          )}
          {actionTarget.mode === 'resolve' && (
            <Input
              label="조치 비고"
              placeholder="예: 케이블 재접속 (참고용, 선택 입력)"
              value={resolutionNote}
              maxLength={RESOLUTION_NOTE_MAX_LENGTH}
              onChange={(event) => setResolutionNote(event.target.value)}
            />
          )}
        </ConfirmModal>
      )}

      {/* 전체 이력 상세 — 상태와 무관하게 항상 전체 정보를 보여주고, 미확인/확인 상태면 그 자리에서 바로 처리도 할 수 있다 */}
      <BaseModal
        visible={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title="알림 상세"
        className="facility-modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailTarget(null)}>
              닫기
            </Button>
            {detailTarget?.status === 'UNCONFIRMED' && (
              <Button variant="primary" onClick={() => handleDetailActionRequest('confirm')}>
                확인 처리
              </Button>
            )}
            {detailTarget?.status === 'CONFIRMED' && (
              <Button variant="primary" onClick={() => handleDetailActionRequest('resolve')}>
                조치완료 처리
              </Button>
            )}
          </>
        }
      >
        {detailTarget && (
          <>
            <div className="facility-modal__grid">
              <div>
                <span className="facility-modal__grid-label">이상 유형</span>
                <p className="facility-modal__grid-value">{formatAlertType(detailTarget.type)}</p>
              </div>
              <div>
                <span className="facility-modal__grid-label">발생일시</span>
                <p className="facility-modal__grid-value">{formatDateTimeCell(detailTarget.triggeredAt)}</p>
              </div>
              <div>
                <span className="facility-modal__grid-label">분전반</span>
                <p className="facility-modal__grid-value">{detailTarget.panelName ?? '-'}</p>
              </div>
              <div>
                <span className="facility-modal__grid-label">회로</span>
                <p className="facility-modal__grid-value">{formatCircuitNo(detailTarget.circuitNo)}</p>
              </div>
              <div>
                <span className="facility-modal__grid-label">처리상태</span>
                <p className="facility-modal__grid-value">
                  <StatusBadge status={detailTarget.status} label={formatAlertStatus(detailTarget.status)} />
                </p>
              </div>
              <div>
                <span className="facility-modal__grid-label">확인자</span>
                <p className="facility-modal__grid-value">{detailTarget.confirmedByName ?? '-'}</p>
              </div>
              <div>
                <span className="facility-modal__grid-label">확인일시</span>
                <p className="facility-modal__grid-value">{formatDateTimeCell(detailTarget.confirmedAt)}</p>
              </div>
              <div>
                <span className="facility-modal__grid-label">조치자</span>
                <p className="facility-modal__grid-value">{detailTarget.resolvedByName ?? '-'}</p>
              </div>
              <div>
                <span className="facility-modal__grid-label">조치일시</span>
                <p className="facility-modal__grid-value">{formatDateTimeCell(detailTarget.resolvedAt)}</p>
              </div>
              <div className="facility-modal__grid-full">
                <span className="facility-modal__grid-label">조치 비고</span>
                <p className="facility-modal__grid-value">{detailTarget.resolutionNote || '입력된 비고 없음'}</p>
              </div>
            </div>
          </>
        )}
      </BaseModal>

      <ConfirmModal
        visible={bulkConfirmOpen}
        title="선택 확인 처리"
        message={`선택한 항목 중 미확인 상태인 ${selectedConfirmableCount}건을 확인 처리하시겠습니까?`}
        confirmLabel="확인 처리"
        onCancel={() => setBulkConfirmOpen(false)}
        onConfirm={handleBulkConfirm}
      />

      <ConfirmModal
        visible={bulkResolveOpen}
        title="선택 조치완료 처리"
        message={`선택한 항목 중 확인됨 상태인 ${selectedResolvableCount}건을 조치완료 처리하시겠습니까?`}
        confirmLabel="조치완료"
        onCancel={() => setBulkResolveOpen(false)}
        onConfirm={handleBulkResolve}
      />

      <ActionResultModal
        visible={Boolean(actionResult)}
        title={actionResult?.title}
        infoRows={actionResult?.infoRows ?? []}
        onClose={() => setActionResult(null)}
      />

      <ConfirmModal
        visible={exportConfirmOpen}
        title="경보 이력 출력"
        message="현재 필터 조건의 경보 이력을 엑셀 파일로 출력하시겠습니까?"
        confirmLabel="출력"
        onCancel={() => setExportConfirmOpen(false)}
        onConfirm={handleExport}
      />
    </div>
  )
}
