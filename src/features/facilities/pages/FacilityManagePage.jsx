import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  createCircuit,
  createPanel,
  deleteCircuit,
  deletePanel,
  getCircuits,
  getPanelDetail,
  getPanels,
  updateCircuit,
} from '../api/facilityApi'
import CircuitFormModal from '../components/CircuitFormModal'
import PanelDetailModal from '../components/PanelDetailModal'
import PanelFormModal from '../components/PanelFormModal'
import PanelTable from '../components/PanelTable'
import { FACILITY_MANAGE_PAGE_SIZE, FACILITY_MANAGE_TABS, MAX_CIRCUIT_CHANNEL } from '../constants/facilityConstants'
import { canManageFacilities } from '../utils/facilityPolicy'
import {
  extractServerMessage,
  formatDateTimeCell,
  formatPanelStatus,
  formatValue,
  summarizeSettledResults,
  THRESHOLD_FIELDS,
} from '../utils/facilityFormatters'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import Pagination from '@/shared/components/data-display/Pagination'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import Checkbox from '@/shared/components/forms/Checkbox'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import FilterBar from '@/shared/components/layout/FilterBar'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { ROLES } from '@/shared/constants/roles'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import { formatResultDateTime } from '@/shared/utils/formatters'
import './FacilityPages.css'

const PAGE_SIZE = FACILITY_MANAGE_PAGE_SIZE
const VALID_TABS = FACILITY_MANAGE_TABS
// 회로 관리 탭 "분전반 선택" 드롭다운은 필터링 없이 현장 전체 목록이 필요해 넉넉한 size로 한 번에 받는다
const ALL_PANELS_SIZE = 100

// 설비 관리 화면
export default function FacilityManagePage() {
  const { role, user } = useAuth()
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

  const [tablePanels, setTablePanels] = useState([])
  const [tableTotalElements, setTableTotalElements] = useState(0)
  const [tableLoading, setTableLoading] = useState(true)
  const tableSeqRef = useRef(0)

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
  const [editCircuitTarget, setEditCircuitTarget] = useState(null)
  const [selectedCircuitIds, setSelectedCircuitIds] = useState([])
  const [circuitDeleteOpen, setCircuitDeleteOpen] = useState(false)
  const [actionResult, setActionResult] = useState(null)

  // 분전반 전체 목록 조회(회로 관리 탭의 "분전반 선택" 드롭다운용) — 페이지 목록과 달리 필터링 없이 현장 전체를 담아야 하므로
  // 큰 size로 한 번에 받아온다. 화면 목록(표)는 별도로 loadTablePanels가 담당한다.
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
      const data = await getPanels({ siteId, size: ALL_PANELS_SIZE })
      if (panelSeqRef.current !== seq) return
      setPanels(data?.content ?? [])
    } catch (error) {
      if (panelSeqRef.current !== seq) return
      const status = error?.response?.status
      setPanelError(status === 403 ? '현재 현장의 설비를 조회할 권한이 없습니다.' : '분전반 목록을 불러오지 못했습니다.')
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

  // 분전반 관리 탭 표: 검색어/페이지는 서버가 필터·페이징한다(API-505)
  const loadTablePanels = useCallback(async () => {
    const siteId = currentSiteId
    const seq = tableSeqRef.current + 1
    tableSeqRef.current = seq
    setTablePanels([])

    if (!siteId) {
      setTableLoading(false)
      return
    }

    setTableLoading(true)
    try {
      const data = await getPanels({ siteId, keyword: keyword.trim() || undefined, page: page - 1, size: PAGE_SIZE })
      if (tableSeqRef.current !== seq) return
      setTablePanels(data?.content ?? [])
      setTableTotalElements(Number(data?.totalElements ?? 0))
    } catch {
      // 표 조회 실패는 loadPanels가 이미 같은 API를 호출하므로 그쪽 에러 배너로 충분 — 여기선 빈 표만 유지
    } finally {
      if (tableSeqRef.current === seq) setTableLoading(false)
    }
  }, [currentSiteId, keyword, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTablePanels()
    return () => {
      tableSeqRef.current += 1
    }
  }, [loadTablePanels])

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
    setSelectedCircuitIds([])

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

  const totalPages = Math.max(1, Math.ceil(tableTotalElements / PAGE_SIZE))

  // 탭 변경
  function switchTab(tab) {
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    if (tab === 'panels') params.delete('panelId')
    setSearchParams(params)
  }

  // 분전반 선택
  function toggleSelect(panelId) {
    if (!canManage) return
    setSelectedPanelIds((prev) => (prev.includes(panelId) ? prev.filter((id) => id !== panelId) : [...prev, panelId]))
  }

  // 현재 페이지 전체 선택
  function toggleSelectAll() {
    if (!canManage) return
    const pageIds = tablePanels.map((panel) => panel.panelId)
    const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedPanelIds.includes(id))
    setSelectedPanelIds((prev) =>
      allChecked ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])],
    )
  }

  // 분전반 등록
  async function handleCreatePanel(payload) {
    if (!canManage) return
    await createPanel(currentSiteId, payload)
    await Promise.all([loadPanels(), loadTablePanels()])
    setActionResult({
      type: 'success',
      title: '등록이 완료되었습니다.',
      subtitle: '현재 현장에 분전반이 등록되었습니다.',
      infoRows: [
        { label: '등록 항목', value: payload.name },
        { label: '등록 시각', value: formatResultDateTime() },
        { label: '등록자', value: user?.name },
      ],
    })
  }

  // 선택 분전반 삭제
  async function handleDeletePanels() {
    if (!canManage) return
    const results = await Promise.allSettled(selectedPanelIds.map((panelId) => deletePanel(panelId)))
    const { successCount, failCount, failureReason } = summarizeSettledResults(results)
    setPanelDeleteOpen(false)
    setActionResult({
      type: failCount ? (successCount ? 'warning' : 'danger') : 'success',
      title: failCount ? (successCount ? '일부 삭제되었습니다.' : '삭제에 실패했습니다.') : '삭제가 완료되었습니다.',
      subtitle: failCount
        ? `성공 ${successCount}건, 실패 ${failCount}건${failureReason ? ` (${failureReason})` : ''}`
        : '선택한 분전반이 삭제되었습니다.',
      infoRows: [
        { label: '삭제 항목', value: `${successCount}건` },
        { label: '삭제 시각', value: formatResultDateTime() },
        { label: '삭제자', value: user?.name },
      ],
    })
    await Promise.all([loadPanels(), loadTablePanels()])
  }

  // 회로 등록
  async function handleCreateCircuit(payload) {
    if (!canManage) return
    await createCircuit(selectedPanelId, payload)
    await loadCircuitsForPanel()
    setActionResult({
      type: 'success',
      title: '등록이 완료되었습니다.',
      subtitle: `${payload.channelNo}번 채널에 회로가 등록되었습니다.`,
      infoRows: [
        { label: '등록 항목', value: `${payload.channelNo}번 채널` },
        { label: '등록 시각', value: formatResultDateTime() },
        { label: '등록자', value: user?.name },
      ],
    })
  }

  // 연결 기기 수정
  async function handleUpdateCircuit(payload) {
    if (!canManage) return
    await updateCircuit(editCircuitTarget.circuitId, payload)
    await loadCircuitsForPanel()
    setActionResult({
      type: 'success',
      title: '수정이 완료되었습니다.',
      subtitle: '변경사항이 저장되었습니다.',
      desc: '수정된 내용은 즉시 반영됩니다.',
      infoRows: [
        { label: '수정 항목', value: `${editCircuitTarget.channelNo}번 채널 연결 기기` },
        { label: '수정 시각', value: formatResultDateTime() },
        { label: '수정자', value: user?.name },
      ],
    })
  }

  // 회로 선택
  function toggleCircuitSelect(circuitId) {
    if (!canManage) return
    setSelectedCircuitIds((prev) =>
      prev.includes(circuitId) ? prev.filter((id) => id !== circuitId) : [...prev, circuitId],
    )
  }

  // 선택 회로 삭제
  async function handleDeleteCircuits() {
    if (!canManage) return
    const results = await Promise.allSettled(selectedCircuitIds.map((circuitId) => deleteCircuit(circuitId)))
    const { successCount, failCount, failureReason } = summarizeSettledResults(results)
    setCircuitDeleteOpen(false)
    setSelectedCircuitIds([])
    setActionResult({
      type: failCount ? (successCount ? 'warning' : 'danger') : 'success',
      title: failCount ? (successCount ? '일부 삭제되었습니다.' : '삭제에 실패했습니다.') : '삭제가 완료되었습니다.',
      subtitle: failCount
        ? `성공 ${successCount}건, 실패 ${failCount}건${failureReason ? ` (${failureReason})` : ''}`
        : '선택한 회로가 삭제되었습니다.',
      infoRows: [
        { label: '삭제 항목', value: `${successCount}건` },
        { label: '삭제 시각', value: formatResultDateTime() },
        { label: '삭제자', value: user?.name },
      ],
    })
    await loadCircuitsForPanel()
  }

  const circuitsByChannel = useMemo(
    () => Object.fromEntries(circuits.map((circuit) => [circuit.channelNo, circuit])),
    [circuits],
  )

  const slots = Array.from({ length: MAX_CIRCUIT_CHANNEL }, (_, index) => {
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
      canManage && activeTab === 'panels' ? (
        <Button variant="primary" onClick={() => setPanelCreateOpen(true)}>
          분전반 등록
        </Button>
      ) : null,
    [activeTab, canManage],
  )
  usePageActions(actions)

  if (panelError) return <ErrorState message={panelError} onRetry={loadPanels} />

  return (
    <div className="facility-page">
      {/* 쿼리파라미터 탭이라 route 기반 TabBar 컴포넌트는 못 쓰지만, 직원관리 화면과 동일하게 탭+필터를 한 카드에 묶는다 */}
      <BaseCard className="card--filter">
        <nav className="tab-bar" role="tablist" aria-label="설비 관리 탭">
          <button
            type="button"
            id="facility-tab-panels"
            role="tab"
            aria-selected={activeTab === 'panels'}
            aria-controls="facility-tabpanel-panels"
            tabIndex={activeTab === 'panels' ? 0 : -1}
            className={`tab-bar__tab ${activeTab === 'panels' ? 'is-active' : ''}`.trim()}
            onClick={() => switchTab('panels')}
          >
            분전반 관리
          </button>
          <button
            type="button"
            id="facility-tab-circuits"
            role="tab"
            aria-selected={activeTab === 'circuits'}
            aria-controls="facility-tabpanel-circuits"
            tabIndex={activeTab === 'circuits' ? 0 : -1}
            className={`tab-bar__tab ${activeTab === 'circuits' ? 'is-active' : ''}`.trim()}
            onClick={() => switchTab('circuits')}
          >
            회로 관리
          </button>
          {role === ROLES.SUPER_ADMIN && (
            <Link to={ROUTE_PATHS.settingsFacilitiesHistory} className="tab-bar__tab">
              변경 이력
            </Link>
          )}
        </nav>
        {activeTab === 'panels' && (
          <FilterBar
            onReset={() => {
              setKeyword('')
              setPage(1)
            }}
            actions={
              canManage ? (
                <Button variant="danger" disabled={selectedPanelIds.length === 0} onClick={() => setPanelDeleteOpen(true)}>
                  선택 삭제 ({selectedPanelIds.length})
                </Button>
              ) : null
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
        {activeTab === 'circuits' && !panelLoading && panels.length > 0 && (
          <FilterBar>
            <div className="facility-inline-field">
              <label htmlFor="circuit-panel-select" className="facility-inline-field__label">
                분전반 선택 :
              </label>
              <Select
                id="circuit-panel-select"
                value={selectedPanelId}
                onChange={(event) => {
                  const nextPanelId = event.target.value
                  setSelectedPanelId(nextPanelId)
                  setSearchParams({ tab: 'circuits', panelId: nextPanelId })
                }}
                options={panelOptions}
              />
            </div>
          </FilterBar>
        )}
      </BaseCard>

      {activeTab === 'panels' && (
        <div
          id="facility-tabpanel-panels"
          role="tabpanel"
          aria-labelledby="facility-tab-panels"
          className="facility-page"
        >
          <PanelTable
            loading={tableLoading}
            panels={tablePanels}
            canManage={canManage}
            selectedIds={selectedPanelIds}
            onToggle={toggleSelect}
            onToggleAll={toggleSelectAll}
            onRowClick={(panel) => setDetailPanelId(panel.panelId)}
            emptyDescription={canManage ? '분전반 등록 버튼을 눌러 현재 현장에 설비를 추가할 수 있습니다.' : undefined}
          />

          {!tableLoading && tableTotalElements > 0 && (
            <div className="facility-list__footer">
              <p className="facility-list__count">총 {tableTotalElements}건 중 {tablePanels.length}건 조회</p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'circuits' && (
        <div
          id="facility-tabpanel-circuits"
          role="tabpanel"
          aria-labelledby="facility-tab-circuits"
          className="facility-manage__layout"
        >
          <BaseCard>
            <h3 className="facility-section-title">선택 분전반</h3>
            {selectedPanelDetail ? (
              <div className="facility-modal__body">
                <h4 className="facility-modal__section-title">기본 정보</h4>
                <div className="facility-modal__grid">
                  <div>
                    <span className="facility-modal__grid-label">분전반명</span>
                    <p className="facility-modal__grid-value">{selectedPanelDetail.name}</p>
                  </div>
                  <div>
                    <span className="facility-modal__grid-label">분전반No</span>
                    <p className="facility-modal__grid-value">{selectedPanelDetail.mNo}</p>
                  </div>
                  <div>
                    <span className="facility-modal__grid-label">최근 통신</span>
                    <p className="facility-modal__grid-value">{formatDateTimeCell(selectedPanelDetail.lastCommunicatedAt)}</p>
                  </div>
                </div>

                <h4 className="facility-modal__section-title">주의 임계값</h4>
                <div className="facility-modal__grid">
                  {THRESHOLD_FIELDS.map((field) => (
                    <div key={field.key}>
                      <span className="facility-modal__grid-label">{field.label}</span>
                      <p className="facility-modal__grid-value">
                        {formatValue(selectedPanelDetail[field.key], field.unit)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="facility-muted">
                {canManage ? '분전반을 선택하면 회로 슬롯을 관리할 수 있습니다.' : '분전반을 선택하면 회로 슬롯을 확인할 수 있습니다.'}
              </p>
            )}
          </BaseCard>

          <BaseCard>
            <div className="facility-section-header">
              <div className="facility-section-header__left">
                <h3 className="facility-section-title">회로 슬롯</h3>
                {selectedPanelDetail && (
                  <p className="facility-muted">
                    {canManage ? '등록 가능 회로' : '사용 회로'}: 1~{selectedPanelDetail.circuitCount} / 상태{' '}
                    {formatPanelStatus(selectedPanelDetail.status)}
                  </p>
                )}
              </div>
              {canManage && (
                <Button
                  variant="danger"
                  disabled={selectedCircuitIds.length === 0}
                  onClick={() => setCircuitDeleteOpen(true)}
                >
                  선택 삭제 ({selectedCircuitIds.length})
                </Button>
              )}
            </div>
            {panelLoading && <LoadingState label="분전반 목록을 불러오는 중입니다..." />}
            {!panelLoading && panels.length === 0 && (
              <EmptyState
                message={canManage ? '회로를 등록할 분전반이 없습니다.' : '조회할 분전반이 없습니다.'}
                description={canManage ? '분전반관리 탭에서 분전반을 먼저 등록해주세요.' : undefined}
              />
            )}
            {!panelLoading && panels.length > 0 && (
              <>
                {circuitLoading && <LoadingState label="회로 정보를 불러오는 중입니다..." />}
                {circuitError && <ErrorState message={circuitError} onRetry={loadCircuitsForPanel} />}
                {!circuitLoading && !circuitError && (
                  <div className="facility-card-list">
                    {slots.map((slot) => (
                      <div
                        key={slot.channelNo}
                        className={`facility-circuit-card ${slot.disabled ? 'is-disabled' : ''}`.trim()}
                      >
                        <div>
                          <div className="facility-circuit-card__top">
                            <span className="facility-circuit-card__title">회로 {slot.channelNo}</span>
                            {canManage && slot.circuit && (
                              <Checkbox
                                checked={selectedCircuitIds.includes(slot.circuit.circuitId)}
                                onChange={() => toggleCircuitSelect(slot.circuit.circuitId)}
                                aria-label={`회로 ${slot.channelNo} 선택`}
                              />
                            )}
                          </div>
                          {slot.disabled && <p className="facility-muted">회로 개수 초과</p>}
                          {!slot.disabled && slot.circuit && (
                            <p className="facility-muted">{slot.circuit.loadType || '연결 기기 없음'}</p>
                          )}
                          {!slot.disabled && !slot.circuit && <p className="facility-muted"></p>}
                        </div>
                        {canManage && !slot.disabled && slot.circuit && (
                          <div className="facility-circuit-card__footer">
                            <Button
                              className="facility-circuit-card__btn facility-circuit-card__btn--edit"
                              variant="secondary"
                              onClick={() => setEditCircuitTarget(slot.circuit)}
                            >
                              수정
                            </Button>
                          </div>
                        )}
                        {canManage && !slot.disabled && !slot.circuit && (
                          <div className="facility-circuit-card__footer">
                            <Button
                              className="facility-circuit-card__btn"
                              variant="primary"
                              onClick={() => setCircuitCreateChannel(slot.channelNo)}
                            >
                              등록
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </BaseCard>
        </div>
      )}

      {canManage && (
        <>
          <PanelFormModal visible={panelCreateOpen} onClose={() => setPanelCreateOpen(false)} onSubmit={handleCreatePanel} />
          <CircuitFormModal
            visible={Boolean(circuitCreateChannel)}
            mode="create"
            channelNo={circuitCreateChannel}
            panelName={selectedPanelDetail?.name}
            onClose={() => setCircuitCreateChannel(null)}
            onSubmit={handleCreateCircuit}
          />
          <CircuitFormModal
            visible={Boolean(editCircuitTarget)}
            mode="edit"
            circuit={editCircuitTarget}
            panelName={selectedPanelDetail?.name}
            onClose={() => setEditCircuitTarget(null)}
            onSubmit={handleUpdateCircuit}
          />
        </>
      )}
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

      {canManage && (
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
      )}
      {canManage && (
        <ConfirmModal
          visible={circuitDeleteOpen}
          title="회로 삭제"
          message="선택한 회로를 삭제하시겠습니까?"
          danger
          confirmLabel="삭제"
          onCancel={() => setCircuitDeleteOpen(false)}
          onConfirm={handleDeleteCircuits}
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
                <span className="confirm-modal__summary-value">{selectedCircuitIds.length}건</span>
                <span className="confirm-modal__summary-badge">삭제</span>
              </p>
              <p className="confirm-modal__summary-detail">선택한 회로 전체가 삭제되어 일반 목록에서 제외됩니다.</p>
            </div>
          </div>
        </ConfirmModal>
      )}

      <ActionResultModal
        visible={Boolean(actionResult)}
        type={actionResult?.type}
        title={actionResult?.title}
        subtitle={actionResult?.subtitle}
        desc={actionResult?.desc}
        infoRows={actionResult?.infoRows ?? [{ label: '처리 시각', value: formatResultDateTime() }]}
        onClose={() => setActionResult(null)}
      />
    </div>
  )
}
