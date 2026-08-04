import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyInspectionItems,
  createInspectionItem,
  deleteInspectionItem,
  getInspectionHistory,
  getInspectionItems,
  getSiteInspectionItems,
  saveInspection,
  updateInspectionItem,
} from '../api/inspectionApi'
import InspectionItemApplyModal from '../components/InspectionItemApplyModal'
import {
  INSPECTION_PANEL_SELECT_SIZE,
  INSPECTION_RESULT_OPTIONS,
  INSPECTION_TABS,
} from '../constants/inspectionConstants'
import {
  extractInspectionServerMessage,
  formatInspectionResult,
  getInspectionResultColor,
  summarizeInspectionResults,
} from '../utils/inspectionFormatters'
import { useAuth } from '@/features/auth/useAuth'
import { getPanels } from '@/features/facilities/api/facilityApi'
import { canManageFacilities } from '@/features/facilities/utils/facilityPolicy'
import { useSite } from '@/features/sites/useSite'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import Input from '@/shared/components/forms/Input'
import Textarea from '@/shared/components/forms/Textarea'
import FilterBar from '@/shared/components/layout/FilterBar'
import TabBar from '@/shared/components/layout/TabBar'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import '@/features/facilities/pages/FacilityPages.css'
import './InspectionPages.css'

// 현재 날짜를 date 입력값 형식으로 변환
function formatDateInputValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  return `${year}-${month}-${day}`
}

// date 입력값에 현재 시각을 붙여 서버 LocalDateTime 문자열로 변환
function toInspectionDateTime(value) {
  if (!value) return null
  const now = new Date()
  const pad = (nextValue) => String(nextValue).padStart(2, '0')
  const hours = pad(now.getHours())
  const minutes = pad(now.getMinutes())
  const seconds = pad(now.getSeconds())
  return `${value}T${hours}:${minutes}:${seconds}`
}

// 점검 체크리스트 화면
export default function InspectionChecklistPage() {
  const { role, user } = useAuth()
  const { currentSiteId } = useSite()
  const canManageItems = canManageFacilities(role)
  const panelSeqRef = useRef(0)
  const itemSeqRef = useRef(0)
  const statusSeqRef = useRef(0)
  const siteItemSeqRef = useRef(0)

  const [panels, setPanels] = useState([])
  const [selectedPanelId, setSelectedPanelId] = useState('')
  const [panelLoading, setPanelLoading] = useState(true)
  const [panelError, setPanelError] = useState('')

  const [siteItems, setSiteItems] = useState([])

  const [items, setItems] = useState([])
  const [itemLoading, setItemLoading] = useState(false)
  const [itemError, setItemError] = useState('')
  const [inspectionStatusByPanelId, setInspectionStatusByPanelId] = useState({})
  const [results, setResults] = useState({})
  const [inspectedAt, setInspectedAt] = useState(formatDateInputValue())
  const [note, setNote] = useState('')

  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [applySaving, setApplySaving] = useState(false)

  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionResult, setActionResult] = useState(null)

  // 점검 항목 관리 모달 열기 — 분전반을 골랐으면 누구나(항목 등록만 모달 안에서 ADMIN 이상으로 갈림)
  const openApplyModal = useCallback(() => {
    if (!selectedPanelId) return
    setApplyModalOpen(true)
  }, [selectedPanelId])

  const actions = useMemo(
    () => (
      <Button variant="primary" disabled={!selectedPanelId} onClick={openApplyModal}>
        점검 항목 관리
      </Button>
    ),
    [openApplyModal, selectedPanelId],
  )
  usePageActions(actions)

  // 현재 현장의 분전반 목록 조회
  const loadPanels = useCallback(async () => {
    const siteId = currentSiteId
    const seq = panelSeqRef.current + 1
    panelSeqRef.current = seq
    setPanels([])
    setSelectedPanelId('')

    if (!siteId) {
      setPanelLoading(false)
      setPanelError('점검 체크리스트는 현장 선택 후 이용할 수 있습니다.')
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
    // 현장이 바뀌면 이전 현장의 분전반/항목 선택이 남지 않도록 새로 조회한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPanels()
    return () => {
      panelSeqRef.current += 1
      statusSeqRef.current += 1
    }
  }, [loadPanels])

  // 현장 점검 항목 카탈로그 조회 — 항목 등록/적용 선택 모달의 후보 목록으로 쓴다
  const loadSiteItems = useCallback(async () => {
    const siteId = currentSiteId
    const seq = siteItemSeqRef.current + 1
    siteItemSeqRef.current = seq
    setSiteItems([])
    if (!siteId) return

    try {
      const data = await getSiteInspectionItems(siteId)
      if (siteItemSeqRef.current !== seq) return
      setSiteItems(data ?? [])
    } catch {
      // 카탈로그 조회 실패해도 체크리스트 자체(적용된 항목 목록)는 별도 API라 화면이 막히지 않는다
    }
  }, [currentSiteId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSiteItems()
    return () => {
      siteItemSeqRef.current += 1
    }
  }, [loadSiteItems])

  // 점검일 기준 분전반별 저장 여부 조회
  const loadPanelInspectionStatus = useCallback(async () => {
    const seq = statusSeqRef.current + 1
    statusSeqRef.current = seq
    setInspectionStatusByPanelId({})

    if (panels.length === 0 || !inspectedAt) return

    const settled = await Promise.allSettled(
      panels.map(async (panel) => {
        const data = await getInspectionHistory(panel.panelId, {
          from: inspectedAt,
          to: inspectedAt,
          page: 0,
          size: 1,
        })
        return [String(panel.panelId), Number(data?.totalElements ?? 0) > 0]
      }),
    )

    if (statusSeqRef.current !== seq) return
    setInspectionStatusByPanelId(
      Object.fromEntries(
        settled
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value),
      ),
    )
  }, [inspectedAt, panels])

  useEffect(() => {
    // 점검일이나 분전반 목록이 바뀌면 저장 필요 표시를 다시 계산한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPanelInspectionStatus()
    return () => {
      statusSeqRef.current += 1
    }
  }, [loadPanelInspectionStatus])

  // 선택 분전반의 점검 항목 조회
  const loadInspectionItems = useCallback(async () => {
    const panelId = selectedPanelId
    const seq = itemSeqRef.current + 1
    itemSeqRef.current = seq
    setItems([])
    setResults({})
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
    // 분전반이 바뀌면 이전 항목 결과를 버리고 새 항목만 반영한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInspectionItems()
    return () => {
      itemSeqRef.current += 1
    }
  }, [loadInspectionItems])

  const selectedPanel = useMemo(
    () => panels.find((panel) => String(panel.panelId) === selectedPanelId) ?? null,
    [panels, selectedPanelId],
  )

  const resultSummary = useMemo(
    () => summarizeInspectionResults(items.map((item) => ({ result: results[String(item.itemId)] }))),
    [items, results],
  )

  // 분전반 목록 표시명 구성
  function formatPanelListLabel(panel) {
    const panelName = panel.name || '-'
    const panelNo = panel.mNo || panel.deviceSerial
    return panelNo ? `${panelName} (${panelNo})` : panelName
  }

  // 점검 결과 선택
  function handleResultChange(itemId, result) {
    setResults((prev) => ({ ...prev, [String(itemId)]: result }))
  }

  // 점검관리 필터 초기화
  function handleResetFilters() {
    setSelectedPanelId(panels[0]?.panelId ? String(panels[0].panelId) : '')
    setInspectedAt(formatDateInputValue())
  }

  // 점검 항목 등록(현장 카탈로그) — InspectionItemApplyModal 안의 인라인 폼에서 호출한다.
  // 성공하면 새로 생긴 itemId를 돌려줘서, 모달이 그 항목을 바로 체크(선택) 상태로 만들 수 있게 한다.
  async function handleCreateItem(payload) {
    const res = await createInspectionItem(currentSiteId, payload)
    await loadSiteItems()
    return res?.itemId
  }

  // 점검 항목 수정(현장 카탈로그) — InspectionItemApplyModal 표 안의 인라인 수정에서 호출한다
  async function handleUpdateItem(itemId, payload) {
    await updateInspectionItem(currentSiteId, itemId, payload)
    await loadSiteItems()
  }

  // 점검 항목 삭제(현장 카탈로그) — InspectionItemApplyModal 표 안의 삭제 확인에서 호출한다
  async function handleDeleteItem(itemId) {
    await deleteInspectionItem(currentSiteId, itemId)
    await loadSiteItems()
  }

  // 분전반에 점검 항목 적용(전체교체) — 확인 단계는 InspectionItemApplyModal 안에서 처리한다
  async function handleApplySubmit(itemIds) {
    setApplySaving(true)
    try {
      await applyInspectionItems(selectedPanelId, itemIds)
      setApplyModalOpen(false)
      setActionResult({
        type: 'success',
        title: '점검 항목이 적용되었습니다.',
        infoRows: [
          { label: '대상 분전반', value: selectedPanel?.name ?? '-' },
          { label: '적용 항목 수', value: `${itemIds.length}건` },
        ],
      })
      await loadInspectionItems()
    } catch (error) {
      setActionResult({
        type: 'danger',
        title: '점검 항목 적용 실패',
        infoRows: [{ label: '사유', value: extractInspectionServerMessage(error, '점검 항목을 적용하지 못했습니다.') }],
      })
    } finally {
      setApplySaving(false)
    }
  }

  // 저장 확인 모달 열기
  function openSaveConfirm() {
    if (!selectedPanelId || items.length === 0) return
    setSaveConfirmOpen(true)
  }

  // 점검 결과 저장
  async function handleSaveInspection() {
    if (!selectedPanelId || items.length === 0) return
    setSaving(true)
    try {
      const payload = {
        inspectedAt: toInspectionDateTime(inspectedAt),
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
          { label: '점검일', value: inspectedAt },
          { label: '점검자', value: user?.name ?? '-' },
        ],
      })
      setInspectionStatusByPanelId((prev) => ({ ...prev, [selectedPanelId]: true }))
      setInspectedAt(formatDateInputValue())
      setNote('')
      setResults(Object.fromEntries(items.map((item) => [String(item.itemId), 'UNCHECKED'])))
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

  if (panelError) return <ErrorState message={panelError} onRetry={loadPanels} />

  return (
    <div className="facility-page inspection-page">
      <BaseCard className="facility-panel-filter-card inspection-checklist-filter-card">
        <TabBar tabs={INSPECTION_TABS} />
        <FilterBar onReset={handleResetFilters}>
          <Input
            id="inspection-at"
            label="점검일"
            type="date"
            value={inspectedAt}
            onChange={(event) => setInspectedAt(event.target.value)}
            className="inspection-filter-field"
          />
        </FilterBar>
      </BaseCard>

      {panelLoading && <LoadingState label="분전반 목록을 불러오는 중입니다..." />}

      {!panelLoading && panels.length === 0 && <EmptyState message="현재 현장에 등록된 분전반이 없습니다." />}

      {!panelLoading && panels.length > 0 && (
        <div className="inspection-checklist-layout">
          <BaseCard className="inspection-panel-list-card">
            <div className="inspection-panel-list" role="listbox" aria-label="점검 대상 분전반">
              {panels.map((panel) => {
                const active = String(panel.panelId) === selectedPanelId
                const needsInspection = inspectionStatusByPanelId[String(panel.panelId)] === false
                return (
                  <button
                    key={panel.panelId}
                    type="button"
                    role="option"
                    className={`inspection-panel-list__item ${active ? 'is-active' : ''}`.trim()}
                    aria-selected={active}
                    onClick={() => setSelectedPanelId(String(panel.panelId))}
                  >
                    <span className="inspection-panel-list__name">{formatPanelListLabel(panel)}</span>
                    {needsInspection && (
                      <span
                        className="inspection-panel-list__dot"
                        title="선택한 점검일에 저장된 점검 결과가 없습니다."
                        aria-label="점검 필요"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </BaseCard>

          <div className="inspection-checklist-main">
            {itemError && <ErrorState message={itemError} onRetry={loadInspectionItems} />}
            {itemLoading && <LoadingState label="점검 항목을 불러오는 중입니다..." />}

            {!itemLoading && !itemError && items.length === 0 && (
              <BaseCard className="inspection-checklist-card">
                <EmptyState
                  message={siteItems.length === 0 ? '현장에 등록된 점검 항목이 없습니다.' : '이 분전반에 적용된 점검 항목이 없습니다.'}
                  description={
                    siteItems.length === 0
                      ? canManageItems
                        ? '점검 항목 관리 버튼으로 현장 점검 항목 카탈로그를 먼저 만들어주세요.'
                        : '관리자에게 점검 항목 등록을 요청해주세요.'
                      : '점검 항목 관리 버튼으로 카탈로그에서 항목을 골라 이 분전반에 적용해주세요.'
                  }
                />
              </BaseCard>
            )}

            {!itemLoading && !itemError && items.length > 0 && (
              <BaseCard
                className="inspection-checklist-card"
                header={
                  <div className="inspection-card-header">
                    <div>
                      <h2 className="facility-section-title">{selectedPanel?.name || '점검 항목'}</h2>
                    </div>
                    <div className="inspection-summary-badges" aria-label="점검 결과 요약">
                      <StatusBadge status="NORMAL" label={`정상 ${resultSummary.normal}`} />
                      <StatusBadge status="ABNORMAL" label={`이상 ${resultSummary.abnormal}`} color="var(--color-danger)" />
                      <StatusBadge
                        status="UNCHECKED"
                        label={`미확인 ${resultSummary.unchecked}`}
                        color="var(--color-text-muted)"
                      />
                    </div>
                  </div>
                }
                footer={
                  <div className="inspection-submit-row">
                    <Button variant="primary" loading={saving} onClick={openSaveConfirm}>
                      점검 결과 저장
                    </Button>
                  </div>
                }
              >
                <div className="inspection-item-list">
                  {items.map((item, index) => (
                    <section key={item.itemId} className="inspection-item-card">
                      <span className="inspection-item-card__index">{index + 1}</span>
                      <div className="inspection-item-card__body">
                        <strong>{item.itemName}</strong>
                        {item.description && <p>{item.description}</p>}
                      </div>
                      <div className="inspection-result-toggle" role="group" aria-label={`${item.itemName} 점검 결과`}>
                        {INSPECTION_RESULT_OPTIONS.map((option) => {
                          const active = results[String(item.itemId)] === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={`inspection-result-toggle__button ${active ? 'is-active' : ''}`.trim()}
                              style={
                                active
                                  ? {
                                      borderColor: getInspectionResultColor(option.value),
                                      color: getInspectionResultColor(option.value),
                                    }
                                  : undefined
                              }
                              onClick={() => handleResultChange(item.itemId, option.value)}
                            >
                              {formatInspectionResult(option.value)}
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>

                <Textarea
                  id="inspection-note"
                  label="특이사항/비고"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  placeholder="점검 중 확인한 내용을 입력하세요."
                />
              </BaseCard>
            )}
          </div>
        </div>
      )}

      <InspectionItemApplyModal
        visible={applyModalOpen}
        panel={selectedPanel}
        siteItems={siteItems}
        appliedItemIds={items.map((item) => item.itemId)}
        canManageItems={canManageItems}
        saving={applySaving}
        onSubmit={handleApplySubmit}
        onCreateItem={handleCreateItem}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onClose={() => setApplyModalOpen(false)}
      />

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
            <p className="confirm-modal__summary-detail">저장된 점검 이력은 이력 화면에서 조회됩니다.</p>
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
