import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { exportInspectionHistory, getInspectionHistory } from '../api/inspectionApi'
import InspectionHistoryDetailModal from '../components/InspectionHistoryDetailModal'
import { INSPECTION_HISTORY_PAGE_SIZE, INSPECTION_PANEL_SELECT_SIZE, INSPECTION_TABS } from '../constants/inspectionConstants'
import {
  extractInspectionServerMessage,
  formatInspectionDateTime,
  summarizeInspectionResults,
} from '../utils/inspectionFormatters'
import { getPanels } from '@/features/facilities/api/facilityApi'
import { useSite } from '@/features/sites/useSite'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import DataTable from '@/shared/components/data-display/DataTable'
import Pagination from '@/shared/components/data-display/Pagination'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import Input from '@/shared/components/forms/Input'
import FilterBar from '@/shared/components/layout/FilterBar'
import TabBar from '@/shared/components/layout/TabBar'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { isoDate } from '@/shared/utils/formatters'
import '@/features/facilities/pages/FacilityPages.css'
import './InspectionPages.css'

// 점검 이력 화면
export default function InspectionHistoryPage() {
  const { currentSiteId } = useSite()
  const panelSeqRef = useRef(0)
  const historySeqRef = useRef(0)

  const [panels, setPanels] = useState([])
  const [selectedPanelId, setSelectedPanelId] = useState('')
  const [panelLoading, setPanelLoading] = useState(true)
  const [panelError, setPanelError] = useState('')

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [histories, setHistories] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const [detailHistory, setDetailHistory] = useState(null)
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [actionResult, setActionResult] = useState(null)

  const actions = useMemo(
    () => (
      <Button variant="primary" disabled={!selectedPanelId || totalElements === 0} onClick={() => setExportConfirmOpen(true)}>
        엑셀다운로드
      </Button>
    ),
    [selectedPanelId, totalElements],
  )
  usePageActions(actions)

  // 현재 현장의 분전반 목록 조회
  const loadPanels = useCallback(async () => {
    const siteId = currentSiteId
    const seq = panelSeqRef.current + 1
    panelSeqRef.current = seq
    setPanels([])
    setSelectedPanelId('')
    setHistories([])
    setTotalElements(0)

    if (!siteId) {
      setPanelLoading(false)
      setPanelError('점검 이력은 현장 선택 후 이용할 수 있습니다.')
      return
    }

    setPanelLoading(true)
    setPanelError('')
    try {
      const data = await getPanels({ siteId, size: INSPECTION_PANEL_SELECT_SIZE })
      if (panelSeqRef.current !== seq) return
      const nextPanels = data?.content ?? []
      setPanels(nextPanels)
      setSelectedPanelId(nextPanels[0]?.panelId ? String(nextPanels[0].panelId) : '')
    } catch (error) {
      if (panelSeqRef.current !== seq) return
      setPanelError(extractInspectionServerMessage(error, '분전반 목록을 불러오지 못했습니다.'))
    } finally {
      if (panelSeqRef.current === seq) setPanelLoading(false)
    }
  }, [currentSiteId])

  useEffect(() => {
    // 현장이 바뀌면 이전 현장의 필터/목록이 남지 않도록 초기화하고 새 분전반을 조회한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrom('')
    setTo('')
    setPage(1)
    loadPanels()
    return () => {
      panelSeqRef.current += 1
      historySeqRef.current += 1
    }
  }, [loadPanels])

  // 선택 분전반의 점검 이력 조회
  const loadHistories = useCallback(async () => {
    const panelId = selectedPanelId
    const seq = historySeqRef.current + 1
    historySeqRef.current = seq
    setHistories([])
    setTotalElements(0)
    setHistoryError('')

    if (!panelId) {
      setHistoryLoading(false)
      return
    }

    setHistoryLoading(true)
    try {
      const data = await getInspectionHistory(panelId, {
        from: from || undefined,
        to: to || undefined,
        page: page - 1,
        size: INSPECTION_HISTORY_PAGE_SIZE,
      })
      if (historySeqRef.current !== seq) return
      setHistories(data?.content ?? [])
      setTotalElements(Number(data?.totalElements ?? 0))
    } catch (error) {
      if (historySeqRef.current !== seq) return
      setHistoryError(extractInspectionServerMessage(error, '점검 이력을 불러오지 못했습니다.'))
    } finally {
      if (historySeqRef.current === seq) setHistoryLoading(false)
    }
  }, [from, page, selectedPanelId, to])

  useEffect(() => {
    // 분전반/기간/페이지가 바뀌면 이력 목록을 다시 조회한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistories()
    return () => {
      historySeqRef.current += 1
    }
  }, [loadHistories])

  const selectedPanel = useMemo(
    () => panels.find((panel) => String(panel.panelId) === selectedPanelId) ?? null,
    [panels, selectedPanelId],
  )

  const columns = useMemo(
    () => [
      { key: 'inspectedAt', header: '점검일시', render: (row) => formatInspectionDateTime(row.inspectedAt) },
      {
        key: 'summary',
        header: '결과 요약',
        render: (row) => {
          const summary = summarizeInspectionResults(row.results ?? [])
          return (
            <span className="inspection-history-summary">
              <StatusBadge status="NORMAL" label={`정상 ${summary.normal}`} />
              <StatusBadge status="ABNORMAL" label={`이상 ${summary.abnormal}`} color="var(--color-danger)" />
              <StatusBadge status="UNCHECKED" label={`미확인 ${summary.unchecked}`} color="var(--color-text-muted)" />
            </span>
          )
        },
      },
      { key: 'inspectorName', header: '점검자', render: (row) => row.inspectorName || '-' },
    ],
    [],
  )

  const totalPages = Math.max(1, Math.ceil(totalElements / INSPECTION_HISTORY_PAGE_SIZE))

  // 기간 필터 초기화
  function handleResetFilters() {
    setFrom('')
    setTo('')
    setPage(1)
  }

  // 분전반 목록 표시명 구성
  function formatPanelListLabel(panel) {
    const panelName = panel.name || '-'
    const panelNo = panel.mNo || panel.deviceSerial
    return panelNo ? `${panelName} (${panelNo})` : panelName
  }

  // 분전반 선택 변경
  function handlePanelChange(value) {
    setSelectedPanelId(value)
    setPage(1)
  }

  // 점검 이력 엑셀 다운로드
  async function handleExportHistory() {
    if (!selectedPanelId || exporting) return
    setExporting(true)
    try {
      const blob = await exportInspectionHistory(selectedPanelId, {
        from: from || undefined,
        to: to || undefined,
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const today = isoDate(new Date()).replaceAll('-', '')
      anchor.href = url
      anchor.download = `점검이력_${today}.xlsx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setExportConfirmOpen(false)
    } catch (error) {
      setExportConfirmOpen(false)
      setActionResult({
        type: 'danger',
        title: '엑셀 다운로드 실패',
        infoRows: [{ label: '사유', value: extractInspectionServerMessage(error, '점검 이력을 엑셀로 다운로드하지 못했습니다.') }],
      })
    } finally {
      setExporting(false)
    }
  }

  if (panelError) return <ErrorState message={panelError} onRetry={loadPanels} />

  return (
    <div className="facility-page inspection-page">
      <BaseCard className="facility-panel-filter-card inspection-history-filter-card">
        <TabBar tabs={INSPECTION_TABS} />
        <FilterBar onReset={handleResetFilters}>
          <Input
            id="inspection-history-from"
            label="검색일"
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setPage(1)
            }}
            aria-label="조회 시작일"
            className="inspection-filter-field"
          />
          <span className="inspection-filter-separator" aria-hidden="true">
            ~
          </span>
          <Input
            id="inspection-history-to"
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setPage(1)
            }}
            aria-label="조회 종료일"
            className="inspection-filter-field"
          />
        </FilterBar>
      </BaseCard>

      {panelLoading && <LoadingState label="분전반 목록을 불러오는 중입니다..." />}

      {!panelLoading && panels.length === 0 && <EmptyState message="현재 현장에 등록된 분전반이 없습니다." />}

      {!panelLoading && panels.length > 0 && (
        <div className="inspection-panel-layout">
          <BaseCard className="inspection-panel-list-card">
            <div className="inspection-panel-list" role="listbox" aria-label="점검 이력 대상 분전반">
              {panels.map((panel) => {
                const active = String(panel.panelId) === selectedPanelId
                return (
                  <button
                    key={panel.panelId}
                    type="button"
                    role="option"
                    className={`inspection-panel-list__item ${active ? 'is-active' : ''}`.trim()}
                    aria-selected={active}
                    onClick={() => handlePanelChange(String(panel.panelId))}
                  >
                    <span className="inspection-panel-list__name">{formatPanelListLabel(panel)}</span>
                  </button>
                )
              })}
            </div>
          </BaseCard>

          <div className="inspection-content-main">
            {historyError && <ErrorState message={historyError} onRetry={loadHistories} />}

            {!historyError && (
              <BaseCard
                className="inspection-history-card"
                footer={
                  totalElements > 0 ? (
                    <div className="facility-list__footer">
                      <p className="facility-list__count">
                        총 {totalElements.toLocaleString('ko-KR')}건 중 {histories.length.toLocaleString('ko-KR')}건 조회
                      </p>
                      <Pagination page={page} totalPages={totalPages} onChange={setPage} pageWindow={8} />
                    </div>
                  ) : null
                }
              >
                <DataTable
                  columns={columns}
                  rows={histories}
                  rowKey={(row) => row.inspectionId}
                  loading={historyLoading}
                  emptyMessage="점검 이력이 없습니다."
                  emptyDescription="선택한 분전반이나 기간 조건을 확인해주세요."
                  onRowClick={(row) => setDetailHistory(row)}
                />
              </BaseCard>
            )}
          </div>
        </div>
      )}

      <InspectionHistoryDetailModal visible={Boolean(detailHistory)} history={detailHistory} onClose={() => setDetailHistory(null)} />

      <ConfirmModal
        visible={exportConfirmOpen}
        title="점검 이력 다운로드"
        confirmLabel={exporting ? '다운로드 중...' : '다운로드'}
        onConfirm={handleExportHistory}
        onCancel={() => setExportConfirmOpen(false)}
      >
        <div className="confirm-modal__summary confirm-modal__summary--neutral">
          <span className="confirm-modal__summary-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="confirm-modal__summary-body">
            <p className="confirm-modal__summary-row">
              <span className="confirm-modal__summary-label">대상 분전반</span>
              <span className="confirm-modal__summary-value">{selectedPanel?.name ?? '-'}</span>
              <span className="confirm-modal__summary-badge">다운로드</span>
            </p>
            <p className="confirm-modal__summary-detail">현재 기간 조건의 점검 이력이 엑셀 파일로 저장됩니다.</p>
          </div>
        </div>
      </ConfirmModal>

      <ActionResultModal
        visible={Boolean(actionResult)}
        type={actionResult?.type}
        title={actionResult?.title}
        infoRows={actionResult?.infoRows ?? []}
        onClose={() => setActionResult(null)}
      />
    </div>
  )
}
