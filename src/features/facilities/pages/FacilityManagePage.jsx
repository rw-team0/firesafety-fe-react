import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createCircuit,
  createPanel,
  deleteCircuit,
  deletePanel,
  getCircuits,
  getPanelDetail,
  getPanels,
} from '../api/facilityApi'
import CircuitFormModal from '../components/CircuitFormModal'
import PanelDetailModal from '../components/PanelDetailModal'
import PanelFormModal from '../components/PanelFormModal'
import PanelTable from '../components/PanelTable'
import { canManageFacilities } from '../utils/facilityPolicy'
import { extractServerMessage, formatDateTimeCell, formatPanelStatus, includesPanelKeyword } from '../utils/facilityFormatters'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import Pagination from '@/shared/components/data-display/Pagination'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import FilterBar from '@/shared/components/layout/FilterBar'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { formatResultDateTime } from '@/shared/utils/formatters'
import './FacilityPages.css'

const PAGE_SIZE = 8
const VALID_TABS = ['panels', 'circuits']

// 삭제 결과 요약
function deleteSummary(results) {
  const successCount = results.filter((result) => result.status === 'fulfilled').length
  return { successCount, failCount: results.length - successCount }
}

// 설비 관리 화면
export default function FacilityManagePage() {
  const { role } = useAuth()
  const { currentSiteId } = useSite()
  const [searchParams, setSearchParams] = useSearchParams()
  const panelSeqRef = useRef(0)
  const circuitSeqRef = useRef(0)

  const canManage = canManageFacilities(role)
  const tabParam = searchParams.get('tab')
  const requestedPanelId = searchParams.get('panelId')
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'panels'

  const [panels, setPanels] = useState([])
  const [panelLoading, setPanelLoading] = useState(true)
  const [panelError, setPanelError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [selectedPanelIds, setSelectedPanelIds] = useState([])
  const [panelCreateOpen, setPanelCreateOpen] = useState(false)
  const [detailPanelId, setDetailPanelId] = useState(null)
  const [panelDeleteOpen, setPanelDeleteOpen] = useState(false)

  const [selectedPanelId, setSelectedPanelId] = useState('')
  const [selectedPanelDetail, setSelectedPanelDetail] = useState(null)
  const [circuits, setCircuits] = useState([])
  const [circuitLoading, setCircuitLoading] = useState(false)
  const [circuitError, setCircuitError] = useState('')
  const [circuitCreateChannel, setCircuitCreateChannel] = useState(null)
  const [deleteCircuitTarget, setDeleteCircuitTarget] = useState(null)
  const [actionResult, setActionResult] = useState(null)

  // 분전반 목록 조회
  const loadPanels = useCallback(async () => {
    const siteId = currentSiteId
    const seq = panelSeqRef.current + 1
    panelSeqRef.current = seq
    setPanels([])
    setSelectedPanelIds([])
    setPage(1)

    if (!siteId) {
      setPanelLoading(false)
      setPanelError('설비 관리는 현장 선택 후 이용할 수 있습니다.')
      return
    }

    setPanelLoading(true)
    setPanelError('')
    try {
      const data = await getPanels({ siteId })
      if (panelSeqRef.current !== seq) return
      setPanels(data ?? [])
    } catch (error) {
      if (panelSeqRef.current !== seq) return
      const status = error?.response?.status
      setPanelError(status === 403 ? '현재 현장의 설비를 관리할 권한이 없습니다.' : '분전반 목록을 불러오지 못했습니다.')
    } finally {
      if (panelSeqRef.current === seq) setPanelLoading(false)
    }
  }, [currentSiteId])

  useEffect(() => {
    // currentSite 변경 즉시 이전 현장 목록/선택을 버리고 새 목록만 반영한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPanels()
    return () => {
      panelSeqRef.current += 1
    }
  }, [loadPanels])

  useEffect(() => {
    if (!panels.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPanelId('')
      return
    }
    const matched = requestedPanelId && panels.find((panel) => String(panel.panelId) === requestedPanelId)
    const nextPanel = matched ?? panels[0]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedPanelId(String(nextPanel.panelId))
  }, [panels, requestedPanelId])

  // 회로 목록 조회
  const loadCircuitsForPanel = useCallback(async () => {
    const panelId = selectedPanelId
    const seq = circuitSeqRef.current + 1
    circuitSeqRef.current = seq
    setSelectedPanelDetail(null)
    setCircuits([])
    setCircuitError('')

    if (!panelId) return

    setCircuitLoading(true)
    try {
      const [detail, list] = await Promise.all([getPanelDetail(panelId), getCircuits(panelId)])
      if (circuitSeqRef.current !== seq) return
      if (detail?.siteId !== currentSiteId) {
        setCircuitError('현재 선택 현장에 속한 분전반이 아닙니다.')
        return
      }
      setSelectedPanelDetail(detail)
      setCircuits(list ?? [])
    } catch (error) {
      if (circuitSeqRef.current !== seq) return
      setCircuitError(extractServerMessage(error, '회로 정보를 불러오지 못했습니다.'))
    } finally {
      if (circuitSeqRef.current === seq) setCircuitLoading(false)
    }
  }, [currentSiteId, selectedPanelId])

  useEffect(() => {
    // 분전반 선택이 바뀌면 이전 회로 슬롯이 남지 않게 비운 뒤 새 응답만 반영한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCircuitsForPanel()
    return () => {
      circuitSeqRef.current += 1
    }
  }, [loadCircuitsForPanel])

  const panelOptions = useMemo(
    () => panels.map((panel) => ({ value: String(panel.panelId), label: `${panel.name} (${panel.mNo || panel.deviceSerial})` })),
    [panels],
  )

  const filteredPanels = panels.filter((panel) => includesPanelKeyword(panel, keyword.trim()))
  const totalPages = Math.max(1, Math.ceil(filteredPanels.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedPanels = filteredPanels.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // 탭 변경
  function switchTab(tab) {
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    if (tab === 'panels') params.delete('panelId')
    setSearchParams(params)
  }

  // 분전반 선택
  function toggleSelect(panelId) {
    setSelectedPanelIds((prev) => (prev.includes(panelId) ? prev.filter((id) => id !== panelId) : [...prev, panelId]))
  }

  // 현재 페이지 전체 선택
  function toggleSelectAll() {
    const pageIds = pagedPanels.map((panel) => panel.panelId)
    const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedPanelIds.includes(id))
    setSelectedPanelIds((prev) =>
      allChecked ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])],
    )
  }

  // 분전반 등록
  async function handleCreatePanel(payload) {
    await createPanel(currentSiteId, payload)
    await loadPanels()
    setActionResult({ type: 'success', title: '분전반 등록 완료', subtitle: '현재 현장에 분전반이 등록되었습니다.' })
  }

  // 선택 분전반 삭제
  async function handleDeletePanels() {
    const results = await Promise.allSettled(selectedPanelIds.map((panelId) => deletePanel(panelId)))
    const { successCount, failCount } = deleteSummary(results)
    setPanelDeleteOpen(false)
    setActionResult({
      type: failCount ? (successCount ? 'warning' : 'danger') : 'success',
      title: failCount ? (successCount ? '분전반 일부 삭제 완료' : '분전반 삭제 실패') : '분전반 삭제 완료',
      subtitle: failCount ? `성공 ${successCount}건, 실패 ${failCount}건` : `${successCount}건이 삭제되었습니다.`,
    })
    await loadPanels()
  }

  // 회로 등록
  async function handleCreateCircuit(payload) {
    await createCircuit(selectedPanelId, payload)
    await loadCircuitsForPanel()
    setActionResult({ type: 'success', title: '회로 등록 완료', subtitle: `${payload.channelNo}번 채널에 회로가 등록되었습니다.` })
  }

  // 회로 삭제
  async function handleDeleteCircuit() {
    try {
      await deleteCircuit(deleteCircuitTarget.circuitId)
      setDeleteCircuitTarget(null)
      setActionResult({ type: 'success', title: '회로 삭제 완료', subtitle: '회로가 일반 목록에서 제외되었습니다.' })
      await loadCircuitsForPanel()
    } catch (error) {
      setDeleteCircuitTarget(null)
      setActionResult({ type: 'danger', title: '회로 삭제 실패', subtitle: extractServerMessage(error, '회로 삭제에 실패했습니다.') })
    }
  }

  const circuitsByChannel = useMemo(
    () => Object.fromEntries(circuits.map((circuit) => [circuit.channelNo, circuit])),
    [circuits],
  )

  const slots = Array.from({ length: 10 }, (_, index) => {
    const channelNo = index + 1
    return {
      channelNo,
      circuit: circuitsByChannel[channelNo],
      disabled: !selectedPanelDetail || channelNo > selectedPanelDetail.circuitCount,
    }
  })

  // 분전반 등록은 분전반관리 탭에서만 의미가 있어 헤더 액션도 그 탭에서만 노출한다
  const actions = useMemo(
    () =>
      activeTab === 'panels' ? (
        <Button variant="primary" onClick={() => setPanelCreateOpen(true)}>
          분전반 등록
        </Button>
      ) : null,
    [activeTab],
  )
  usePageActions(actions)

  if (!canManage) return <ErrorState message="설비 관리 권한이 없습니다." />
  if (panelError) return <ErrorState message={panelError} onRetry={loadPanels} />

  return (
    <div className="facility-page">
      {/* 쿼리파라미터 탭이라 route 기반 TabBar 컴포넌트는 못 쓰지만, 직원관리 화면과 동일하게 탭+필터를 한 카드에 묶는다 */}
      <BaseCard className="card--filter">
        <nav className="tab-bar" aria-label="설비 관리 탭">
          <button
            type="button"
            className={`tab-bar__tab ${activeTab === 'panels' ? 'is-active' : ''}`.trim()}
            onClick={() => switchTab('panels')}
          >
            분전반 관리
          </button>
          <button
            type="button"
            className={`tab-bar__tab ${activeTab === 'circuits' ? 'is-active' : ''}`.trim()}
            onClick={() => switchTab('circuits')}
          >
            회로 관리
          </button>
        </nav>
        {activeTab === 'panels' && (
          <FilterBar
            onReset={() => {
              setKeyword('')
              setPage(1)
            }}
            actions={
              <Button variant="danger" disabled={selectedPanelIds.length === 0} onClick={() => setPanelDeleteOpen(true)}>
                선택 삭제 ({selectedPanelIds.length})
              </Button>
            }
          >
            <Input
              aria-label="분전반 검색"
              placeholder="장비번호, 분전반명, 분전반No"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
            />
          </FilterBar>
        )}
      </BaseCard>

      {activeTab === 'panels' && (
        <>
          <PanelTable
            loading={panelLoading}
            panels={pagedPanels}
            canManage
            selectedIds={selectedPanelIds}
            onToggle={toggleSelect}
            onToggleAll={toggleSelectAll}
            onRowClick={(panel) => setDetailPanelId(panel.panelId)}
            emptyDescription="분전반 등록 버튼을 눌러 현재 현장에 설비를 추가할 수 있습니다."
          />

          {!panelLoading && filteredPanels.length > 0 && (
            <div className="facility-list__footer">
              <p className="facility-list__count">
                총 {panels.length}건 중 {filteredPanels.length}건 조회
              </p>
              <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}

      {activeTab === 'circuits' && (
        <div className="facility-manage__layout">
          <BaseCard>
            <h3 className="facility-section-title">회로 슬롯</h3>
            {panelLoading && <LoadingState label="분전반 목록을 불러오는 중입니다..." />}
            {!panelLoading && panels.length === 0 && <p className="facility-muted">회로를 등록할 분전반이 없습니다.</p>}
            {!panelLoading && panels.length > 0 && (
              <>
                <div className="facility-panel-picker">
                  <Select
                    label="분전반 선택"
                    value={selectedPanelId}
                    onChange={(event) => {
                      const nextPanelId = event.target.value
                      setSelectedPanelId(nextPanelId)
                      setSearchParams({ tab: 'circuits', panelId: nextPanelId })
                    }}
                    options={panelOptions}
                  />
                  {selectedPanelDetail && (
                    <p className="facility-muted">
                      등록 가능 채널: 1~{selectedPanelDetail.circuitCount} / 상태 {formatPanelStatus(selectedPanelDetail.status)}
                    </p>
                  )}
                </div>

                {circuitLoading && <LoadingState label="회로 정보를 불러오는 중입니다..." />}
                {circuitError && <ErrorState message={circuitError} onRetry={loadCircuitsForPanel} />}
                {!circuitLoading && !circuitError && (
                  <div className="facility-card-list">
                    {slots.map((slot) => (
                      <div
                        key={slot.channelNo}
                        className={`facility-circuit-card ${slot.disabled ? 'is-disabled' : ''}`.trim()}
                      >
                        <div className="facility-circuit-card__top">
                          <span className="facility-circuit-card__title">채널 {slot.channelNo}</span>
                          {slot.circuit && (
                            <StatusBadge status={slot.circuit.status} label={formatPanelStatus(slot.circuit.status)} />
                          )}
                        </div>
                        {slot.disabled && <p className="facility-muted">분전반 회로 개수 초과</p>}
                        {!slot.disabled && slot.circuit && (
                          <>
                            <p className="facility-muted">{slot.circuit.loadType || '부하 종류 없음'}</p>
                            <Button variant="danger" onClick={() => setDeleteCircuitTarget(slot.circuit)}>
                              삭제
                            </Button>
                          </>
                        )}
                        {!slot.disabled && !slot.circuit && (
                          <>
                            <p className="facility-muted">빈 채널</p>
                            <Button variant="primary" onClick={() => setCircuitCreateChannel(slot.channelNo)}>
                              회로 등록
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </BaseCard>

          <BaseCard>
            <h3 className="facility-section-title">선택 분전반</h3>
            {selectedPanelDetail ? (
              <div className="facility-detail__grid">
                <div className="facility-detail__item">
                  <span className="facility-detail__item-label">분전반명</span>
                  <span className="facility-detail__item-value">{selectedPanelDetail.name}</span>
                </div>
                <div className="facility-detail__item">
                  <span className="facility-detail__item-label">분전반No</span>
                  <span className="facility-detail__item-value">{selectedPanelDetail.mNo}</span>
                </div>
                <div className="facility-detail__item">
                  <span className="facility-detail__item-label">최근 통신</span>
                  <span className="facility-detail__item-value">{formatDateTimeCell(selectedPanelDetail.lastCommunicatedAt)}</span>
                </div>
              </div>
            ) : (
              <p className="facility-muted">분전반을 선택하면 회로 슬롯을 관리할 수 있습니다.</p>
            )}
          </BaseCard>
        </div>
      )}

      <PanelFormModal visible={panelCreateOpen} onClose={() => setPanelCreateOpen(false)} onSubmit={handleCreatePanel} />
      <PanelDetailModal
        visible={Boolean(detailPanelId)}
        panelId={detailPanelId}
        canManage={canManage}
        onClose={() => setDetailPanelId(null)}
        onUpdated={() => {
          loadPanels()
          loadCircuitsForPanel()
        }}
      />
      <CircuitFormModal
        visible={Boolean(circuitCreateChannel)}
        channelNo={circuitCreateChannel}
        panelName={selectedPanelDetail?.name}
        onClose={() => setCircuitCreateChannel(null)}
        onSubmit={handleCreateCircuit}
      />

      <ConfirmModal
        visible={panelDeleteOpen}
        title="분전반 삭제"
        message="선택한 분전반을 삭제하시겠습니까?"
        danger
        confirmLabel="삭제"
        onCancel={() => setPanelDeleteOpen(false)}
        onConfirm={handleDeletePanels}
      >
        <div className="confirm-modal__summary">
          <span className="confirm-modal__summary-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="confirm-modal__summary-body">
            <p className="confirm-modal__summary-row">
              <span className="confirm-modal__summary-label">대상</span>
              <span className="confirm-modal__summary-value">{selectedPanelIds.length}건</span>
              <span className="confirm-modal__summary-badge">삭제</span>
            </p>
            <p className="confirm-modal__summary-detail">선택한 분전반 전체가 삭제되어 일반 목록에서 제외됩니다.</p>
          </div>
        </div>
      </ConfirmModal>
      <ConfirmModal
        visible={Boolean(deleteCircuitTarget)}
        title="회로 삭제"
        message="선택한 회로를 삭제하시겠습니까?"
        danger
        confirmLabel="삭제"
        onCancel={() => setDeleteCircuitTarget(null)}
        onConfirm={handleDeleteCircuit}
      >
        <div className="confirm-modal__summary">
          <span className="confirm-modal__summary-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="confirm-modal__summary-body">
            <p className="confirm-modal__summary-row">
              <span className="confirm-modal__summary-label">대상</span>
              <span className="confirm-modal__summary-value">{deleteCircuitTarget?.channelNo}번 채널</span>
              <span className="confirm-modal__summary-badge">삭제</span>
            </p>
            <p className="confirm-modal__summary-detail">삭제된 회로는 일반 목록에서 제외됩니다.</p>
          </div>
        </div>
      </ConfirmModal>

      <ActionResultModal
        visible={Boolean(actionResult)}
        type={actionResult?.type}
        title={actionResult?.title}
        subtitle={actionResult?.subtitle}
        infoRows={[{ label: '처리 시각', value: formatResultDateTime() }]}
        onClose={() => setActionResult(null)}
      />
    </div>
  )
}
