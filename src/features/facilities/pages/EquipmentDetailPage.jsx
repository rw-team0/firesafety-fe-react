import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPanelDetail } from '../api/facilityApi'
import PanelMonitoringDetail, { PanelStatusSubtitle, PanelThresholdSummary } from '../components/PanelMonitoringDetail'
import { canManageFacilities } from '../utils/facilityPolicy'
import { extractServerMessage } from '../utils/facilityFormatters'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { usePageActions, usePageSubtitle } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './FacilityPages.css'

// 설비 상세 화면
export default function EquipmentDetailPage() {
  const { panelId } = useParams()
  const { role } = useAuth()
  const { currentSiteId } = useSite()
  const navigate = useNavigate()
  const requestSeqRef = useRef(0)

  const canManage = canManageFacilities(role)
  const [panel, setPanel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // 분전반 상세 조회
  const load = useCallback(async () => {
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq
    setPanel(null)
    setLoading(true)
    setLoadError('')

    try {
      const data = await getPanelDetail(panelId)
      if (requestSeqRef.current !== seq) return
      if (currentSiteId && data?.siteId !== currentSiteId) {
        setLoadError('현재 선택 현장에 속한 설비가 아닙니다.')
        return
      }
      setPanel(data)
    } catch (error) {
      if (requestSeqRef.current !== seq) return
      const status = error?.response?.status
      setLoadError(
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
      if (requestSeqRef.current === seq) setLoading(false)
    }
  }, [panelId, currentSiteId])

  useEffect(() => {
    // currentSite가 바뀐 상태에서 이전 상세 응답이 남지 않도록 요청 순서를 끊는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return () => {
      requestSeqRef.current += 1
    }
  }, [load])

  // 등록/수정/삭제는 설비관리(SCR-502) 전용 — 이 화면은 조회만 담당하므로 회로관리 이동 링크만 남긴다.
  const actions = useMemo(
    () =>
      canManage && panel ? (
        <Button
          variant="secondary"
          onClick={() => navigate(`${ROUTE_PATHS.settingsFacilities}?tab=circuits&panelId=${panel.panelId}`)}
        >
          회로 관리
        </Button>
      ) : null,
    [canManage, navigate, panel],
  )
  usePageActions(actions)

  const subtitle = useMemo(() => (panel ? <PanelStatusSubtitle panel={panel} /> : null), [panel])
  usePageSubtitle(subtitle)

  if (loading) return <LoadingState label="설비 상세를 불러오는 중입니다..." />

  if (loadError) {
    return (
      <div className="facility-page">
        <ErrorState message={loadError} onRetry={load} />
        <div>
          <Button variant="secondary" onClick={() => navigate(ROUTE_PATHS.equipmentList)}>
            설비 모니터링으로
          </Button>
        </div>
      </div>
    )
  }

  if (!panel) return null

  return (
    <div className="facility-page">
      <BaseCard>
        <PanelThresholdSummary panel={panel} />
      </BaseCard>
      <PanelMonitoringDetail panel={panel} />
    </div>
  )
}
