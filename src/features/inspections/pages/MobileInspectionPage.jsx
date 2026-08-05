import { useCallback, useEffect, useRef, useState } from 'react'
import { getInspectionHistory, getInspectionItems, saveInspection } from '../api/inspectionApi'
import { INSPECTION_PANEL_SELECT_SIZE, INSPECTION_RESULT_OPTIONS } from '../constants/inspectionConstants'
import {
  extractInspectionServerMessage,
  formatInspectionDateTime,
  formatInspectionResult,
  getInspectionResultColor,
  summarizeInspectionResults,
} from '../utils/inspectionFormatters'
import { getPanels } from '@/features/facilities/api/facilityApi'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import Button from '@/shared/components/buttons/Button'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import Select from '@/shared/components/forms/Select'
import Textarea from '@/shared/components/forms/Textarea'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import BaseModal from '@/shared/components/modals/BaseModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { formatResultDateTime } from '@/shared/utils/formatters'
import './MobileInspectionPage.css'

const HISTORY_PAGE_SIZE = 8

// 저장 시각은 PC처럼 날짜 입력을 따로 받지 않고 항상 "지금"으로 기록한다(현장에서 바로 체크하는 용도)
function nowDateTimeString() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function formatPanelOptionLabel(panel) {
  const panelNo = panel.mNo || panel.deviceSerial
  return panelNo ? `${panel.name || '-'} (${panelNo})` : panel.name || '-'
}

// SCR-505-M/506-M 점검 — 상단 점검/이력 탭으로 모드를 고르고, 그 아래에서 대상 분전반을 고른다
export default function MobileInspectionPage() {
  const { user } = useAuth()
  const { currentSiteId } = useSite()
  const [activeTab, setActiveTab] = useState('checklist') // 'checklist' | 'history'

  const [panels, setPanels] = useState([])
  const [selectedPanelId, setSelectedPanelId] = useState('')
  const [panelLoading, setPanelLoading] = useState(true)
  const [panelError, setPanelError] = useState('')
  const panelSeqRef = useRef(0)

  // 점검 체크리스트
  const [items, setItems] = useState([])
  const [results, setResults] = useState({})
  const [note, setNote] = useState('')
  const [itemLoading, setItemLoading] = useState(false)
  const [itemError, setItemError] = useState('')
  const itemSeqRef = useRef(0)
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionResult, setActionResult] = useState(null)

  // 점검 이력(무한스크롤)
  const [histories, setHistories] = useState([])
  const [historyNextPage, setHistoryNextPage] = useState(0)
  const [historyHasMore, setHistoryHasMore] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const historySeqRef = useRef(0)
  const sentinelRef = useRef(null)
  const [detailHistory, setDetailHistory] = useState(null)

  const loadPanels = useCallback(async () => {
    const siteId = currentSiteId
    const seq = panelSeqRef.current + 1
    panelSeqRef.current = seq

    if (!siteId) {
      setPanels([])
      setSelectedPanelId('')
      setPanelLoading(false)
      return
    }

    setPanelLoading(true)
    setPanelError('')
    try {
      const data = await getPanels({ siteId, size: INSPECTION_PANEL_SELECT_SIZE })
      if (panelSeqRef.current !== seq) return
      const nextPanels = Array.isArray(data?.content) ? data.content : []
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPanels()
  }, [loadPanels])

  const loadItems = useCallback(async () => {
    const panelId = selectedPanelId
    const seq = itemSeqRef.current + 1
    itemSeqRef.current = seq
    setItems([])
    setResults({})
    setNote('')
    setItemError('')

    if (!panelId) {
      setItemLoading(false)
      return
    }

    setItemLoading(true)
    try {
      const data = await getInspectionItems(panelId)
      if (itemSeqRef.current !== seq) return
      const nextItems = data ?? []
      setItems(nextItems)
      setResults(Object.fromEntries(nextItems.map((item) => [String(item.itemId), 'UNCHECKED'])))
    } catch (error) {
      if (itemSeqRef.current !== seq) return
      setItemError(extractInspectionServerMessage(error, '점검 항목을 불러오지 못했습니다.'))
    } finally {
      if (itemSeqRef.current === seq) setItemLoading(false)
    }
  }, [selectedPanelId])

  useEffect(() => {
    if (activeTab !== 'checklist') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadItems()
  }, [activeTab, loadItems])

  const loadHistoryFirstPage = useCallback(async () => {
    const panelId = selectedPanelId
    const seq = historySeqRef.current + 1
    historySeqRef.current = seq
    setHistoryError('')

    if (!panelId) {
      setHistories([])
      setHistoryHasMore(false)
      setHistoryLoading(false)
      return
    }

    setHistoryLoading(true)
    try {
      const data = await getInspectionHistory(panelId, { page: 0, size: HISTORY_PAGE_SIZE })
      if (historySeqRef.current !== seq) return
      const content = Array.isArray(data?.content) ? data.content : []
      setHistories(content)
      setHistoryNextPage(1)
      setHistoryHasMore(content.length === HISTORY_PAGE_SIZE)
    } catch (error) {
      if (historySeqRef.current !== seq) return
      setHistoryError(extractInspectionServerMessage(error, '점검 이력을 불러오지 못했습니다.'))
    } finally {
      if (historySeqRef.current === seq) setHistoryLoading(false)
    }
  }, [selectedPanelId])

  useEffect(() => {
    if (activeTab !== 'history') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistoryFirstPage()
  }, [activeTab, loadHistoryFirstPage])

  const loadMoreHistory = useCallback(async () => {
    if (!historyHasMore || historyLoading || historyLoadingMore) return
    const panelId = selectedPanelId
    if (!panelId) return
    setHistoryLoadingMore(true)
    try {
      const data = await getInspectionHistory(panelId, { page: historyNextPage, size: HISTORY_PAGE_SIZE })
      const content = Array.isArray(data?.content) ? data.content : []
      setHistories((prev) => [...prev, ...content])
      setHistoryNextPage((prev) => prev + 1)
      setHistoryHasMore(content.length === HISTORY_PAGE_SIZE)
    } catch {
      setHistoryHasMore(false)
    } finally {
      setHistoryLoadingMore(false)
    }
  }, [historyHasMore, historyLoading, historyLoadingMore, selectedPanelId, historyNextPage])

  useEffect(() => {
    if (activeTab !== 'history') return undefined
    const node = sentinelRef.current
    if (!node) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreHistory()
      },
      { threshold: 0.1 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [activeTab, loadMoreHistory])

  function handleResultChange(itemId, result) {
    setResults((prev) => ({ ...prev, [String(itemId)]: result }))
  }

  function openSaveConfirm() {
    if (!selectedPanelId || items.length === 0) return
    setSaveConfirmOpen(true)
  }

  async function handleSaveInspection() {
    const selectedPanel = panels.find((panel) => String(panel.panelId) === selectedPanelId)
    setSaving(true)
    try {
      const payload = {
        inspectedAt: nowDateTimeString(),
        results: items.map((item) => ({
          itemId: item.itemId,
          result: results[String(item.itemId)] ?? 'UNCHECKED',
        })),
        note: note.trim() || null,
      }
      await saveInspection(selectedPanelId, payload)
      setSaveConfirmOpen(false)
      setActionResult({
        type: 'success',
        title: '점검 결과가 저장되었습니다.',
        infoRows: [
          { label: '점검 대상', value: selectedPanel?.name ?? '-' },
          { label: '점검 시각', value: formatResultDateTime() },
          { label: '점검자', value: user?.name ?? '-' },
        ],
      })
      setResults(Object.fromEntries(items.map((item) => [String(item.itemId), 'UNCHECKED'])))
      setNote('')
    } catch (error) {
      setSaveConfirmOpen(false)
      setActionResult({
        type: 'danger',
        title: '점검 결과 저장 실패',
        infoRows: [{ label: '사유', value: extractInspectionServerMessage(error, '점검 결과를 저장하지 못했습니다.') }],
      })
    } finally {
      setSaving(false)
    }
  }

  const selectedPanel = panels.find((panel) => String(panel.panelId) === selectedPanelId) ?? null
  const resultSummary = summarizeInspectionResults(items.map((item) => ({ result: results[String(item.itemId)] })))

  if (panelError) return <ErrorState message={panelError} onRetry={loadPanels} />

  return (
    <div className="mobile-inspection">
      <div className="mobile-inspection__tabs" role="tablist" aria-label="점검 모드">
        <span
          className="mobile-inspection__tabs-thumb"
          style={{ transform: activeTab === 'history' ? 'translateX(100%)' : 'translateX(0%)' }}
          aria-hidden="true"
        />
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'checklist'}
          className={`mobile-inspection__tab ${activeTab === 'checklist' ? 'is-active' : ''}`.trim()}
          onClick={() => setActiveTab('checklist')}
        >
          점검
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`mobile-inspection__tab ${activeTab === 'history' ? 'is-active' : ''}`.trim()}
          onClick={() => setActiveTab('history')}
        >
          이력
        </button>
      </div>

      {panelLoading ? (
        <LoadingState label="분전반 목록을 불러오는 중입니다..." />
      ) : panels.length === 0 ? (
        <EmptyState message="현재 현장에 등록된 분전반이 없습니다." />
      ) : (
        <>
          <div className="mobile-inspection__filter">
            <Select
              aria-label="점검 대상 분전반"
              value={selectedPanelId}
              onChange={(event) => setSelectedPanelId(event.target.value)}
              options={panels.map((panel) => ({ value: String(panel.panelId), label: formatPanelOptionLabel(panel) }))}
            />
          </div>

          {activeTab === 'checklist' ? (
            itemLoading ? (
              <LoadingState label="점검 항목을 불러오는 중입니다..." />
            ) : itemError ? (
              <ErrorState message={itemError} onRetry={loadItems} />
            ) : items.length === 0 ? (
              <EmptyState
                message="이 분전반에 적용된 점검 항목이 없습니다."
                description="관리자에게 점검 항목 적용을 요청해주세요."
              />
            ) : (
              <>
                <div className="mobile-inspection-summary" aria-label="점검 결과 요약">
                  <StatusBadge status="NORMAL" label={`정상 ${resultSummary.normal}`} />
                  <StatusBadge status="ABNORMAL" label={`이상 ${resultSummary.abnormal}`} color="var(--color-danger)" />
                  <StatusBadge status="UNCHECKED" label={`미확인 ${resultSummary.unchecked}`} color="var(--color-text-muted)" />
                </div>

                <div className="mobile-inspection-item-list">
                  {items.map((item) => (
                    <div key={item.itemId} className="mobile-inspection-item-card">
                      <strong>{item.itemName}</strong>
                      {item.description && <p>{item.description}</p>}
                      <div className="mobile-inspection-result-toggle" role="group" aria-label={`${item.itemName} 점검 결과`}>
                        {INSPECTION_RESULT_OPTIONS.map((option) => {
                          const active = results[String(item.itemId)] === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={`mobile-inspection-result-toggle__button ${active ? 'is-active' : ''}`.trim()}
                              style={active ? { borderColor: getInspectionResultColor(option.value), color: getInspectionResultColor(option.value) } : undefined}
                              onClick={() => handleResultChange(item.itemId, option.value)}
                            >
                              {formatInspectionResult(option.value)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <Textarea
                  label="특이사항/비고"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="점검 중 확인한 내용을 입력하세요."
                />

                <Button variant="primary" loading={saving} onClick={openSaveConfirm}>
                  점검 결과 저장
                </Button>
              </>
            )
          ) : historyError ? (
            <ErrorState message={historyError} onRetry={loadHistoryFirstPage} />
          ) : historyLoading ? (
            <LoadingState label="점검 이력을 불러오는 중입니다..." />
          ) : histories.length === 0 ? (
            <EmptyState message="점검 이력이 없습니다." />
          ) : (
            <>
              <div className="mobile-inspection-history-list">
                {histories.map((history) => {
                  const summary = summarizeInspectionResults(history.results ?? [])
                  return (
                    <button
                      key={history.inspectionId}
                      type="button"
                      className="mobile-inspection-history-row"
                      onClick={() => setDetailHistory(history)}
                    >
                      <span className="mobile-inspection-history-row__top">
                        <strong>{formatInspectionDateTime(history.inspectedAt)}</strong>
                        <span className="mobile-inspection-history-row__inspector">{history.inspectorName || '-'}</span>
                      </span>
                      <span className="mobile-inspection-history-row__summary">
                        <StatusBadge status="NORMAL" label={`정상 ${summary.normal}`} />
                        <StatusBadge status="ABNORMAL" label={`이상 ${summary.abnormal}`} color="var(--color-danger)" />
                        <StatusBadge status="UNCHECKED" label={`미확인 ${summary.unchecked}`} color="var(--color-text-muted)" />
                      </span>
                    </button>
                  )
                })}
              </div>

              {historyHasMore && (
                <div ref={sentinelRef} className="mobile-inspection__sentinel">
                  {historyLoadingMore && <LoadingState label="더 불러오는 중입니다..." />}
                </div>
              )}
            </>
          )}
        </>
      )}

      <ConfirmModal
        visible={saveConfirmOpen}
        title="점검 결과 저장"
        confirmLabel="저장"
        onConfirm={handleSaveInspection}
        onCancel={() => setSaveConfirmOpen(false)}
      >
        <div className="confirm-modal__summary confirm-modal__summary--neutral">
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
            <p className="confirm-modal__summary-row">
              <span className="confirm-modal__summary-label">점검 대상</span>
              <span className="confirm-modal__summary-value">{selectedPanel?.name ?? '-'}</span>
              <span className="confirm-modal__summary-badge">저장</span>
            </p>
            <p className="confirm-modal__summary-detail">저장된 점검 이력은 이력 탭에서 조회됩니다.</p>
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

      {/* 점검 이력 상세 — 항목별 결과 + 비고 */}
      <BaseModal
        visible={Boolean(detailHistory)}
        onClose={() => setDetailHistory(null)}
        title="점검 이력 상세"
        className="modal-panel--narrow"
        footer={
          <Button variant="primary" onClick={() => setDetailHistory(null)}>
            닫기
          </Button>
        }
      >
        {detailHistory && (
          <div className="mobile-inspection-detail">
            <div className="mobile-inspection-detail__row">
              <span>점검일시</span>
              <strong>{formatInspectionDateTime(detailHistory.inspectedAt)}</strong>
            </div>
            <div className="mobile-inspection-detail__row">
              <span>점검자</span>
              <strong>{detailHistory.inspectorName || '-'}</strong>
            </div>
            <div className="mobile-inspection-detail__items">
              {(detailHistory.results ?? []).map((item) => (
                <div key={item.itemId} className="mobile-inspection-detail__item-row">
                  <span>{item.itemName}</span>
                  <StatusBadge status={item.result} label={formatInspectionResult(item.result)} color={getInspectionResultColor(item.result)} />
                </div>
              ))}
            </div>
            <div className="mobile-inspection-detail__note">
              <span className="mobile-inspection-detail__note-label">비고</span>
              <p>{detailHistory.note || '입력된 비고 없음'}</p>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  )
}
