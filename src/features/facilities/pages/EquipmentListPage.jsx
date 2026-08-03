import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPanelDetail, getPanels } from '../api/facilityApi'
import PanelMonitoringDetail, { PanelStatusSubtitle, PanelThresholdSummary } from '../components/PanelMonitoringDetail'
import { extractServerMessage } from '../utils/facilityFormatters'
import { canManageFacilities } from '../utils/facilityPolicy'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { usePageActions, usePageSubtitle } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import Select from '@/shared/components/forms/Select'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './FacilityPages.css'

// 설비 모니터링 화면(SCR-501) — 현재 현장의 분전반을 선택해 상세 상태를 조회한다.
export default function EquipmentListPage() {
  const { role } = useAuth()
  const { currentSiteId } = useSite()
  const navigate = useNavigate()
  const panelSeqRef = useRef(0)
  const detailSeqRef = useRef(0)
  const canManage = canManageFacilities(role)

  const [panels, setPanels] = useState([])
  const [selectedPanelId, setSelectedPanelId] = useState('')
  const [selectedPanel, setSelectedPanel] = useState(null)
  const [panelLoading, setPanelLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [panelError, setPanelError] = useState('')
  const [detailError, setDetailError] = useState('')

  // 현재 현장 분전반 선택 목록 조회
  const loadPanels = useCallback(async () => {
    const siteId = currentSiteId
    const seq = panelSeqRef.current + 1
    panelSeqRef.current = seq
    detailSeqRef.current += 1

    setPanels([])
    setSelectedPanelId('')
    setSelectedPanel(null)
    setDetailError('')

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
      setSelectedPanelId(nextPanels[0]?.panelId ? String(nextPanels[0].panelId) : '')
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
      detailSeqRef.current += 1
    }
  }, [loadPanels])

  // 선택한 분전반 상세 조회
  const loadSelectedPanel = useCallback(async () => {
    const panelId = selectedPanelId
    const siteId = currentSiteId
    const seq = detailSeqRef.current + 1
    detailSeqRef.current = seq

    setSelectedPanel(null)
    setDetailError('')

    if (!panelId) {
      setDetailLoading(false)
      return
    }

    setDetailLoading(true)
    try {
      const data = await getPanelDetail(panelId)
      if (detailSeqRef.current !== seq) return
      if (siteId && data?.siteId !== siteId) {
        setDetailError('현재 선택 현장에 속한 설비가 아닙니다.')
        return
      }
      setSelectedPanel(data)
    } catch (error) {
      if (detailSeqRef.current !== seq) return
      const status = error?.response?.status
      setDetailError(
        extractServerMessage(
          error,
          status === 403
            ? '이 설비를 조회할 권한이 없습니다.'
            : status === 404
              ? '분전반을 찾을 수 없습니다.'
              : '설비 상세를 불러오지 못했습니다.',
        ),
      )
    } finally {
      if (detailSeqRef.current === seq) setDetailLoading(false)
    }
  }, [currentSiteId, selectedPanelId])

  useEffect(() => {
    // 분전반 선택이 바뀌면 이전 상세가 남지 않게 비우고 최신 선택의 상세만 반영한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSelectedPanel()
    return () => {
      detailSeqRef.current += 1
    }
  }, [loadSelectedPanel])

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

  const subtitle = useMemo(
    () => (selectedPanel ? <PanelStatusSubtitle panel={selectedPanel} /> : null),
    [selectedPanel],
  )
  usePageSubtitle(subtitle)

  const panelOptions = useMemo(
    () =>
      panels.map((panel) => ({
        value: String(panel.panelId),
        label: `${panel.name} / ${panel.deviceSerial || '-'} / 분전반No ${panel.mNo || '-'}`,
      })),
    [panels],
  )

  if (panelError) return <ErrorState message={panelError} onRetry={loadPanels} />

  return (
    <div className="facility-page">
      <BaseCard className="card--filter">
        <div className="facility-inline-field facility-monitoring-selector">
          <label htmlFor="monitoring-panel-select" className="facility-inline-field__label">
            분전반 선택 :
          </label>
          <Select
            id="monitoring-panel-select"
            value={selectedPanelId}
            onChange={(event) => setSelectedPanelId(event.target.value)}
            options={panelOptions}
            placeholder={panelLoading ? '분전반 목록을 불러오는 중입니다' : '분전반을 선택해주세요'}
            disabled={panelLoading || panels.length === 0}
          />
        </div>
        {selectedPanel && (
          <div className="facility-filter-divider">
            <PanelThresholdSummary panel={selectedPanel} />
          </div>
        )}
      </BaseCard>

      {panelLoading && <LoadingState label="분전반 목록을 불러오는 중입니다..." />}

      {!panelLoading && panels.length === 0 && <EmptyState message="현재 현장에 등록된 분전반이 없습니다." />}

      {!panelLoading && panels.length > 0 && detailLoading && <LoadingState label="설비 상세를 불러오는 중입니다..." />}

      {!panelLoading && panels.length > 0 && detailError && (
        <ErrorState message={detailError} onRetry={loadSelectedPanel} />
      )}

      {!panelLoading && panels.length > 0 && !detailLoading && !detailError && selectedPanel && (
        <PanelMonitoringDetail panel={selectedPanel} />
      )}
    </div>
  )
}
