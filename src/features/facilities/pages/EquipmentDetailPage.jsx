import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPanelDetail } from '../api/facilityApi'
import { canManageFacilities } from '../utils/facilityPolicy'
import {
  formatAlertType,
  formatDateTimeCell,
  formatOnline,
  formatPanelStatus,
  formatValue,
  getSensorFieldStatus,
  SENSOR_FIELDS,
  THRESHOLD_FIELDS,
} from '../utils/facilityFormatters'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import DataTable from '@/shared/components/data-display/DataTable'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import './FacilityPages.css'

// 상세 항목 렌더링 — status가 'warning'/'danger'면 카드에 색을 입힌다(하드웨어 알람·임계값 초과 표시용)
function DetailItem({ label, value, status }) {
  const statusClass = status && status !== 'normal' ? ` facility-detail__item--${status}` : ''
  return (
    <div className={`facility-detail__item${statusClass}`}>
      <span className="facility-detail__item-label">{label}</span>
      <span className="facility-detail__item-value">{value ?? '-'}</span>
    </div>
  )
}

const RECENT_ALERT_COLUMNS = [
  { key: 'alertId', header: '경보 ID' },
  { key: 'type', header: '유형', render: (row) => formatAlertType(row.type) },
  { key: 'triggeredAt', header: '발생 시각', render: (row) => formatDateTimeCell(row.triggeredAt) },
]

// 설비 상세 화면
export default function EquipmentDetailPage() {
  const { panelId } = useParams()
  const { role } = useAuth()
  const { currentSiteId, currentSite } = useSite()
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
        status === 403
          ? '이 설비를 조회할 권한이 없습니다.'
          : status === 404
            ? '분전반을 찾을 수 없습니다.'
            : '설비 상세를 불러오지 못했습니다.',
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

  const thresholdRows = THRESHOLD_FIELDS.map((field) => ({
    ...field,
    value: panel[field.key],
  }))

  return (
    <div className="facility-page">
      <BaseCard>
        <div className="facility-summary">
          <div>
            <h2 className="facility-summary__title">{panel.name}</h2>
            <p className="facility-summary__meta">{currentSite?.name ?? '현재 현장'} 설비 상세</p>
          </div>
          <StatusBadge status={panel.status} label={formatPanelStatus(panel.status)} />
        </div>
      </BaseCard>

      <BaseCard>
        <h3 className="facility-section-title">기본정보</h3>
        <div className="facility-detail__grid">
          <DetailItem label="장비번호" value={panel.deviceSerial} />
          <DetailItem label="분전반No" value={panel.mNo} />
          <DetailItem label="통신 상태" value={formatOnline(panel.isOnline)} />
          <DetailItem label="최근 통신 시각" value={formatDateTimeCell(panel.lastCommunicatedAt)} />
          <DetailItem label="설치일" value={panel.installedAt || '-'} />
          <DetailItem label="회로 개수" value={panel.circuitCount} />
        </div>
      </BaseCard>

      <BaseCard>
        <h3 className="facility-section-title">최신 센서값</h3>
        <div className="facility-detail__grid">
          {SENSOR_FIELDS.map((field) => (
            <DetailItem
              key={field.key}
              label={field.label}
              value={formatValue(panel[field.key], field.unit)}
              status={getSensorFieldStatus(panel, field)}
            />
          ))}
          <DetailItem
            label="도어"
            value={panel.doorStatus == null ? '-' : panel.doorStatus ? '열림' : '닫힘'}
            status={panel.doorStatus ? 'danger' : 'normal'}
          />
        </div>
      </BaseCard>

      <BaseCard>
        <h3 className="facility-section-title">임계값</h3>
        <div className="facility-detail__grid">
          {thresholdRows.map((field) => (
            <DetailItem key={field.key} label={field.label} value={formatValue(field.value, field.unit)} />
          ))}
        </div>
      </BaseCard>

      <BaseCard>
        <h3 className="facility-section-title">회로 상태</h3>
        {panel.circuits?.length ? (
          <div className="facility-card-list">
            {panel.circuits.map((circuit) => (
              <div key={circuit.circuitId} className="facility-circuit-card">
                <div className="facility-circuit-card__top">
                  <span className="facility-circuit-card__title">회로 {circuit.channelNo}</span>
                  <StatusBadge status={circuit.status} label={formatPanelStatus(circuit.status)} />
                </div>
                <p className="facility-muted">{circuit.loadType || '연결 기기 없음'}</p>
                <p className="facility-muted">전류 {formatValue(circuit.currentA, 'A')}</p>
                <p className="facility-muted">아크 {circuit.arcCounter ?? 0}회</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="등록된 회로가 없습니다." />
        )}
      </BaseCard>

      <BaseCard>
        <h3 className="facility-section-title">최근 경보</h3>
        <DataTable
          rows={panel.recentAlerts ?? []}
          rowKey={(row) => row.alertId}
          columns={RECENT_ALERT_COLUMNS}
          emptyMessage="최근 경보가 없습니다."
        />
      </BaseCard>
    </div>
  )
}
