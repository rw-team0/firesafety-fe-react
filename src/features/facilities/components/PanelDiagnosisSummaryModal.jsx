import { useEffect, useMemo, useState } from 'react'
import { getPanelDiagnosisSummary } from '../api/diagnosisApi'
import { extractServerMessage, formatDateTimeCell } from '../utils/facilityFormatters'
import { DIAGNOSIS_TRIGGER_TYPE_LABELS, VERDICT_LABELS, labelOf } from '@/shared/constants/domainLabels'
import Button from '@/shared/components/buttons/Button'
import DataTable from '@/shared/components/data-display/DataTable'
import Pagination from '@/shared/components/data-display/Pagination'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import BaseModal from '@/shared/components/modals/BaseModal'

const DIAGNOSIS_TABS = [
  { key: 'recent', label: '최근 판정' },
  { key: 'arc', label: '아크 판정' },
  { key: 'waiting', label: '자동 대기' },
]

const PAGE_SIZE = 6

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

function formatPercent(value, total) {
  const denominator = Number(total ?? 0)
  if (!denominator) return '0.0%'
  return `${((Number(value ?? 0) / denominator) * 100).toFixed(1)}%`
}

function formatConfidence(value) {
  return value == null ? '-' : `${Math.round(value * 100)}%`
}

function formatTriggerType(value) {
  return labelOf(DIAGNOSIS_TRIGGER_TYPE_LABELS, value)
}

// 분전반 전체 AI 현황. 회로별 이력/수동 실행은 CircuitDiagnosisModal이 담당한다.
export default function PanelDiagnosisSummaryModal({ panel, visible, onClose }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('recent')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!visible || !panel?.panelId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setLoadError('')
    getPanelDiagnosisSummary(panel.panelId)
      .then(setSummary)
      .catch((error) => setLoadError(extractServerMessage(error, 'AI 진단 현황을 불러오지 못했습니다.')))
      .finally(() => setLoading(false))
  }, [visible, panel?.panelId])

  const coverage = formatPercent(summary?.diagnosedCircuitCount, summary?.totalCircuitCount)
  const waitingCount = summary?.sampleInsufficientCircuits?.length ?? 0

  const resultColumns = useMemo(
    () => [
      { key: 'channelNo', header: '회로', render: (row) => `회로 ${row.channelNo}` },
      {
        key: 'verdict',
        header: '판정',
        render: (row) => <StatusBadge status={row.verdict} label={VERDICT_LABELS[row.verdict] ?? row.verdict} />,
      },
      { key: 'confidence', header: '신뢰도', render: (row) => formatConfidence(row.confidence) },
      { key: 'nSamples', header: '샘플 수', render: (row) => row.nSamples ?? '-' },
      { key: 'triggerType', header: '방식', render: (row) => formatTriggerType(row.triggerType) },
      {
        key: 'diagnosedAt',
        header: '판정 시각',
        className: 'facility-diagnosis-table__datetime',
        render: (row) => formatDateTimeCell(row.diagnosedAt),
      },
    ],
    [],
  )

  const waitingColumns = useMemo(
    () => [
      { key: 'channelNo', header: '회로', render: (row) => `회로 ${row.channelNo}` },
      { key: 'sampleCount', header: '새 샘플', render: (row) => formatNumber(row.sampleCount) },
      { key: 'requiredSampleCount', header: '필요 샘플', render: (row) => formatNumber(row.requiredSampleCount) },
    ],
    [],
  )

  const activeRows =
    activeTab === 'recent'
      ? summary?.recentResults ?? []
      : activeTab === 'arc'
        ? summary?.recentArcResults ?? []
        : summary?.sampleInsufficientCircuits ?? []
  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = activeRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const activeColumns = activeTab === 'waiting' ? waitingColumns : resultColumns
  const activeEmptyMessage =
    activeTab === 'recent'
      ? 'AI 진단 이력이 없습니다.'
      : activeTab === 'arc'
        ? '최근 아크 판정이 없습니다.'
        : '모든 회로가 자동 진단 기준을 충족했습니다.'
  const activeRowKey = activeTab === 'waiting' ? (row) => row.circuitId : (row) => row.resultId

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      title="AI 진단 현황"
      className="facility-modal facility-diagnosis-modal"
      footer={
        <Button variant="secondary" onClick={onClose}>
          닫기
        </Button>
      }
    >
      {loading ? (
        <LoadingState label="AI 진단 현황을 불러오는 중입니다..." />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : summary ? (
        <div className="facility-diagnosis-summary">
          <div className="facility-diagnosis-kpis">
            <div className="facility-diagnosis-kpi">
              <span className="facility-modal__grid-label">최근 진단 시각</span>
              <p className="facility-modal__grid-value">{formatDateTimeCell(summary.latestDiagnosedAt)}</p>
            </div>
            <div className="facility-diagnosis-kpi">
              <span className="facility-modal__grid-label">진단 커버리지</span>
              <p className="facility-modal__grid-value">
                {coverage} ({formatNumber(summary.diagnosedCircuitCount)} / {formatNumber(summary.totalCircuitCount)})
              </p>
            </div>
            <div className="facility-diagnosis-kpi">
              <span className="facility-modal__grid-label">최근 24시간 판정</span>
              <p className="facility-modal__grid-value">{formatNumber(summary.last24hTotalCount)}건</p>
            </div>
            <div className="facility-diagnosis-kpi">
              <span className="facility-modal__grid-label">최근 24시간 아크</span>
              <p className="facility-modal__grid-value">{formatNumber(summary.last24hArcCount)}건</p>
            </div>
          </div>

          <div className="facility-diagnosis-tabs" role="tablist" aria-label="AI 진단 현황">
            {DIAGNOSIS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`facility-diagnosis-tabs__button ${activeTab === tab.key ? 'is-active' : ''}`.trim()}
                onClick={() => {
                  setActiveTab(tab.key)
                  setPage(1)
                }}
                role="tab"
                aria-selected={activeTab === tab.key}
              >
                {tab.label}
                {tab.key === 'waiting' && <span>{formatNumber(waitingCount)}</span>}
              </button>
            ))}
          </div>

          <div className="facility-diagnosis-panel" role="tabpanel">
            <DataTable
              rows={pagedRows}
              rowKey={activeRowKey}
              columns={activeColumns}
              emptyMessage={activeEmptyMessage}
            />
            {activeRows.length > 0 && (
              <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} pageWindow={5} />
            )}
          </div>
        </div>
      ) : (
        <EmptyState message="AI 진단 현황이 없습니다." />
      )}
    </BaseModal>
  )
}
