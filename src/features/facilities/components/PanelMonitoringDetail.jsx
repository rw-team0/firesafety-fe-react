import { useCallback, useEffect, useRef, useState } from 'react'
import { confirmAlert, getAlerts, resolveAlert } from '@/features/alerts/api/alertApi'
import CircuitDiagnosisModal from './CircuitDiagnosisModal'
import PanelDiagnosisSummaryModal from './PanelDiagnosisSummaryModal'
import {
  extractServerMessage,
  formatAlertStatus,
  formatAlertType,
  formatDateTimeCell,
  formatOnline,
  formatPanelStatus,
  formatThresholdSummary,
  formatValue,
  getCircuitRiskLevel,
  getDoorStatusTone,
  getSensorFieldStatus,
  SENSOR_FIELDS,
} from '../utils/facilityFormatters'
import { useAuth } from '@/features/auth/useAuth'
import Button from '@/shared/components/buttons/Button'
import BaseCard from '@/shared/components/data-display/BaseCard'
import DataTable from '@/shared/components/data-display/DataTable'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import Input from '@/shared/components/forms/Input'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import BaseModal from '@/shared/components/modals/BaseModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { formatResultDateTime } from '@/shared/utils/formatters'

const RESOLUTION_NOTE_MAX_LENGTH = 500

// 센서값 타일 — 이 화면에서 가장 먼저 봐야 하는 값이라 아이콘+값을 크게, 이상값에만 테두리 전체를 색으로 강조하고 배경을 옅게 채운다
function SensorTile({ icon, label, value, status }) {
  const statusClass = status && status !== 'normal' ? ` facility-sensor-tile--${status}` : ''
  return (
    <div className={`facility-sensor-tile${statusClass}`}>
      <span className="facility-sensor-tile__label">
        {icon && <span className="facility-sensor-tile__icon">{icon}</span>}
        {label}
      </span>
      <span className="facility-sensor-tile__value">{value ?? '-'}</span>
    </div>
  )
}

// 분전반 이름 + 상태 + 통신상태 — 페이지 헤더 제목 옆(usePageSubtitle)에 "/ 1층 분전반 [상태] 통신두절" 형태로 붙인다
export function PanelStatusSubtitle({ panel }) {
  return (
    <span className="facility-header-subtitle">
      {panel.name}
      <StatusBadge status={panel.status} label={formatPanelStatus(panel.status)} />
      <span className="facility-header-subtitle__comm">{formatOnline(panel.isOnline)}</span>
    </span>
  )
}

// 주의 임계값 한 줄 요약 — 필터바/상세화면 상단에 붙이는 참고용 텍스트
export function PanelThresholdSummary({ panel }) {
  return (
    <p className="facility-threshold-summary">
      <b>주의 임계값</b> · {formatThresholdSummary(panel)}
    </p>
  )
}

const RECENT_ALERT_SIZE = 4

// 처리상태별 담당자 — 확인 전은 없고, 확인 후엔 확인자, 조치완료 후엔 조치자로 바뀐다
function formatProcessedBy(row) {
  if (row.status === 'RESOLVED') return row.resolvedByName ?? '-'
  if (row.status === 'CONFIRMED') return row.confirmedByName ?? '-'
  return '-'
}

// 분전반 실시간 모니터링 정보 — 센서 상태(핵심) → 회로 상태 → 이상 감지 현황 순으로 배치한다
// (REQ-203: 회로/장비 상태는 서버가 하드웨어+AI 판정을 조합해 계산해 circuit.status/panel.status로 내려준다)
// 상태는 정상/주의/위험 한글 배지를 따로 붙이지 않고, 카드 테두리/배경 색만으로 표시한다(참고: Vue EquipmentDetailView의 circuitCardStyle과 동일한 원칙)
export default function PanelMonitoringDetail({ panel }) {
  const { user } = useAuth()
  const [diagnosisCircuit, setDiagnosisCircuit] = useState(null)
  const [diagnosisSummaryOpen, setDiagnosisSummaryOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [alertsError, setAlertsError] = useState('')
  const alertSeqRef = useRef(0)

  const [actionTarget, setActionTarget] = useState(null) // { alert, mode: 'confirm' | 'resolve' }
  const [resolutionNote, setResolutionNote] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionResult, setActionResult] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null) // 조치완료(RESOLVED) 행 클릭 시 읽기전용 상세

  // 이상 감지 현황 — 경량 panel.recentAlerts(유형+시각)만으론 처리상태가 없어 GET /alerts를 panelId로 따로 조회한다
  const loadAlerts = useCallback(() => {
    const panelId = panel.panelId
    const seq = alertSeqRef.current + 1
    alertSeqRef.current = seq
    setAlertsError('')
    setAlertsLoading(true)

    getAlerts({ panelId, size: RECENT_ALERT_SIZE })
      .then((data) => {
        if (alertSeqRef.current !== seq) return
        setAlerts(data?.content ?? [])
      })
      .catch((error) => {
        if (alertSeqRef.current !== seq) return
        setAlertsError(extractServerMessage(error, '이상 감지 현황을 불러오지 못했습니다.'))
      })
      .finally(() => {
        if (alertSeqRef.current === seq) setAlertsLoading(false)
      })
  }, [panel.panelId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlerts([])
    loadAlerts()
    return () => {
      alertSeqRef.current += 1
    }
  }, [loadAlerts])

  // 미확인 경보 확인 또는 확인된 경보 조치완료 처리
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
      loadAlerts()
    } catch (error) {
      setActionError(extractServerMessage(error, '처리에 실패했습니다.'))
    }
  }

  const recentAlertColumns = [
    { key: 'triggeredAt', header: '발생 시각', render: (row) => formatDateTimeCell(row.triggeredAt) },
    { key: 'type', header: '이상 유형', render: (row) => formatAlertType(row.type) },
    {
      key: 'status',
      header: '처리상태',
      render: (row) => <StatusBadge status={row.status} label={formatAlertStatus(row.status)} />,
    },
    { key: 'processedBy', header: '처리자', render: formatProcessedBy },
  ]

  // 조치완료(RESOLVED)는 처리할 액션이 없어 읽기전용 상세(누가 언제 확인/조치했는지)를 보여준다
  function handleAlertRowClick(row) {
    if (row.status === 'RESOLVED') {
      setDetailTarget(row)
      return
    }
    setActionTarget({ alert: row, mode: row.status === 'UNCONFIRMED' ? 'confirm' : 'resolve' })
  }

  return (
    <>
      <div className="facility-monitor-row">
        <BaseCard>
          <h3 className="facility-section-title">센서 상태</h3>
          <div className="facility-sensor-grid">
            {SENSOR_FIELDS.map((field) => (
              <SensorTile
                key={field.key}
                icon={field.icon}
                label={field.label}
                value={formatValue(panel[field.key], field.unit)}
                status={getSensorFieldStatus(panel, field)}
              />
            ))}
            <SensorTile
              icon="🚪"
              label="도어"
              value={panel.doorStatus == null ? '-' : panel.doorStatus ? '열림' : '닫힘'}
              status={getDoorStatusTone(panel)}
            />
          </div>
        </BaseCard>

        <BaseCard>
          <div className="facility-section-header">
            <h3 className="facility-section-title">회로 상태</h3>
            <Button variant="ghost" onClick={() => setDiagnosisSummaryOpen(true)}>
              AI 진단 현황
            </Button>
          </div>
          {panel.circuits?.length ? (
            <div className="facility-monitor-circuit-grid">
              {panel.circuits.map((circuit) => {
                const riskLevel = getCircuitRiskLevel(circuit.status)
                const riskClass = riskLevel !== 'normal' ? ` facility-circuit-card--${riskLevel}` : ''
                return (
                  <div key={circuit.circuitId} className={`facility-circuit-card${riskClass}`}>
                    <div className="facility-circuit-card__top">
                      <span className="facility-circuit-card__title">회로 {circuit.channelNo}</span>
                      {circuit.loadType && <span className="facility-circuit-card__load">{circuit.loadType}</span>}
                    </div>
                    <p className="facility-circuit-card__current">{formatValue(circuit.currentA, 'A')}</p>
                    <p className="facility-muted">아크 {circuit.arcCounter ?? 0}회</p>
                    <div className="facility-circuit-card__footer">
                      <Button
                        // 카드 테두리 색(정상/주의/위험)과는 별개로, AI 진단 버튼은 ARC 신호가 있다는 것 자체를 바로 눈에 띄게 빨간색으로 표시한다.
                        // CAUTION은 "하드웨어 정상+AI ARC"라 카드가 노랗게만 보여도 AI는 이미 위험을 보내고 있는 상태 — 그 신호를 버튼에서 강조한다.
                        variant={riskLevel === 'danger' || riskLevel === 'warning' ? 'danger' : 'secondary'}
                        className="facility-circuit-card__btn"
                        onClick={() => setDiagnosisCircuit(circuit)}
                      >
                        AI 진단
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState message="등록된 회로가 없습니다." />
          )}
        </BaseCard>
      </div>

      <BaseCard>
        <h3 className="facility-section-title">이상 감지 현황</h3>
        {alertsError ? (
          <ErrorState message={alertsError} />
        ) : (
          <DataTable
            rows={alerts}
            rowKey={(row) => row.alertId}
            columns={recentAlertColumns}
            loading={alertsLoading}
            emptyMessage="최근 이상 감지 이력이 없습니다."
            onRowClick={handleAlertRowClick}
          />
        )}
      </BaseCard>

      {actionTarget && (
        <ConfirmModal
          visible={!!actionTarget}
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

      <ActionResultModal
        visible={!!actionResult}
        title={actionResult?.title}
        infoRows={actionResult?.infoRows ?? []}
        onClose={() => setActionResult(null)}
      />

      <BaseModal
        visible={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="이상 감지 상세"
        className="facility-modal"
        footer={
          <Button variant="primary" onClick={() => setDetailTarget(null)}>
            닫기
          </Button>
        }
      >
        {detailTarget && (
          <div className="facility-modal__grid">
            <div>
              <span className="facility-modal__grid-label">이상 유형</span>
              <p className="facility-modal__grid-value">{formatAlertType(detailTarget.type)}</p>
            </div>
            <div>
              <span className="facility-modal__grid-label">발생 시각</span>
              <p className="facility-modal__grid-value">{formatDateTimeCell(detailTarget.triggeredAt)}</p>
            </div>
            <div>
              <span className="facility-modal__grid-label">확인자</span>
              <p className="facility-modal__grid-value">{detailTarget.confirmedByName ?? '-'}</p>
            </div>
            <div>
              <span className="facility-modal__grid-label">확인 시각</span>
              <p className="facility-modal__grid-value">{formatDateTimeCell(detailTarget.confirmedAt)}</p>
            </div>
            <div>
              <span className="facility-modal__grid-label">조치자</span>
              <p className="facility-modal__grid-value">{detailTarget.resolvedByName ?? '-'}</p>
            </div>
            <div>
              <span className="facility-modal__grid-label">조치 시각</span>
              <p className="facility-modal__grid-value">{formatDateTimeCell(detailTarget.resolvedAt)}</p>
            </div>
            <div className="facility-modal__grid-full">
              <span className="facility-modal__grid-label">조치 비고</span>
              <p className="facility-modal__grid-value">{detailTarget.resolutionNote || '입력된 비고 없음'}</p>
            </div>
          </div>
        )}
      </BaseModal>

      <CircuitDiagnosisModal
        circuit={diagnosisCircuit}
        visible={Boolean(diagnosisCircuit)}
        onClose={() => setDiagnosisCircuit(null)}
      />

      <PanelDiagnosisSummaryModal
        panel={panel}
        visible={diagnosisSummaryOpen}
        onClose={() => setDiagnosisSummaryOpen(false)}
      />
    </>
  )
}
