import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getStatistics } from '../api/statisticsApi'
import { countOf, percentOf, sumCounts } from '../utils/statisticsFormatters'
import { useSite } from '@/features/sites/useSite'
import BaseCard from '@/shared/components/data-display/BaseCard'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import StatusBadge from '@/shared/components/feedback/StatusBadge'
import Input from '@/shared/components/forms/Input'
import FilterBar from '@/shared/components/layout/FilterBar'
import { PANEL_STATUS_COLOR, STATUS_BADGE_COLOR } from '@/shared/constants/domainColors'
import { formatDateTime, isoDate } from '@/shared/utils/formatters'
import './StatisticsPage.css'

// 통계 화면 숫자 표기 통일
function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

// 기본 조회 기간: 최근 7일(다른 이력 화면들과 동일 기준)
function defaultFromDate() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return isoDate(date)
}

// SCR-601 통계 — /api/statistics 하나로 경보/AI진단/분전반/점검 현황을 받아 그린다.
// 무거운 집계(일자별 상태 추이 등)는 프론트에서 계산하지 않고, 전부 백엔드가 미리 계산해 내려주는 값만 사용한다.
export default function StatisticsPage() {
  const { currentSiteId } = useSite()
  const [from, setFrom] = useState(defaultFromDate)
  const [to, setTo] = useState(() => isoDate(new Date()))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    if (!currentSiteId) {
      setLoading(false)
      setLoadError('통계는 현장 선택 후 이용할 수 있습니다.')
      return
    }
    setLoading(true)
    setLoadError('')
    try {
      const result = await getStatistics({ siteId: currentSiteId, from, to })
      setData(result)
    } catch (error) {
      setLoadError(error?.response?.data?.resultMessage || '통계를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [currentSiteId, from, to])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function handleReset() {
    setFrom(defaultFromDate())
    setTo(isoDate(new Date()))
  }

  const alerts = data?.alerts
  const diagnoses = data?.diagnoses
  const panels = data?.panels
  const inspections = data?.inspections

  const unresolvedAlertCount = useMemo(() => sumCounts(alerts?.statusCounts, ['UNCONFIRMED', 'CONFIRMED']), [alerts])
  const arcDiagnosisCount = useMemo(() => countOf(diagnoses?.verdictCounts, 'ARC'), [diagnoses])
  const normalDiagnosisCount = useMemo(() => countOf(diagnoses?.verdictCounts, 'NORMAL'), [diagnoses])
  const resolvedRate = useMemo(
    () => percentOf(countOf(alerts?.statusCounts, 'RESOLVED'), alerts?.totalCount),
    [alerts],
  )
  const arcRate = useMemo(() => percentOf(arcDiagnosisCount, diagnoses?.totalCount), [arcDiagnosisCount, diagnoses])
  const normalDiagnosisRate = useMemo(
    () => percentOf(normalDiagnosisCount, diagnoses?.totalCount),
    [normalDiagnosisCount, diagnoses],
  )
  const diagnosisCoverageRate = useMemo(
    () => percentOf(diagnoses?.diagnosedCircuitCount, diagnoses?.totalCircuitCount),
    [diagnoses],
  )

  const dailyChartData = useMemo(() => alerts?.dailyCounts ?? [], [alerts])

  const panelChartData = useMemo(
    () => (panels?.statusCounts ?? []).filter((row) => row.count > 0).map((row) => ({ ...row, fill: PANEL_STATUS_COLOR[row.key] })),
    [panels],
  )
  const normalPanelRate = useMemo(
    () => percentOf(countOf(panels?.statusCounts, 'NORMAL'), panels?.totalCount),
    [panels],
  )

  const alertTypeChartData = useMemo(
    () => (alerts?.typeCounts ?? []).filter((row) => row.count > 0).sort((a, b) => b.count - a.count),
    [alerts],
  )

  if (loading) return <LoadingState label="통계를 불러오는 중입니다..." />
  if (loadError) return <ErrorState message={loadError} onRetry={load} />
  if (!data) return null

  return (
    <div className="statistics-page">
      <div className="statistics-kpi-grid">
        <BaseCard className="statistics-kpi">
          <span className="statistics-kpi__label">전체 경보</span>
          <strong className="statistics-kpi__value">
            {formatNumber(alerts?.totalCount)}
            <span>건</span>
          </strong>
        </BaseCard>
        <BaseCard className="statistics-kpi">
          <span className="statistics-kpi__label">미처리 경보</span>
          <strong className="statistics-kpi__value">
            {formatNumber(unresolvedAlertCount)}
            <span>건</span>
          </strong>
        </BaseCard>
        <BaseCard className="statistics-kpi">
          <span className="statistics-kpi__label">AI 이상감지</span>
          <strong className="statistics-kpi__value">
            {formatNumber(arcDiagnosisCount)}
            <span>건</span>
          </strong>
        </BaseCard>
        <BaseCard className="statistics-kpi">
          <span className="statistics-kpi__label">조치완료율</span>
          <strong className="statistics-kpi__value">
            {resolvedRate}
            <span>%</span>
          </strong>
        </BaseCard>
      </div>

      <BaseCard className="card--filter statistics-filter-card">
        <FilterBar onReset={handleReset}>
          <Input
            id="statistics-from"
            label="검색일"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="statistics-filter-field"
          />
          <span className="statistics-date-separator" aria-hidden="true">
            ~
          </span>
          <Input
            id="statistics-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="statistics-filter-field"
          />
        </FilterBar>
      </BaseCard>

      <div className="statistics-split-grid">
        <BaseCard header={<h2 className="statistics-section-title">일자별 경보 발생 추이</h2>}>
          {dailyChartData.length ? (
            <div className="statistics-chart">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip />
                  <Bar dataKey="count" name="경보 건수" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="기간 내 경보가 없습니다." />
          )}
        </BaseCard>

        <BaseCard header={<h2 className="statistics-section-title">분전반 상태 분포</h2>}>
          {panelChartData.length ? (
            <div className="statistics-chart statistics-donut-wrap">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={panelChartData} dataKey="count" nameKey="label" cx="50%" cy="42%" innerRadius={40} outerRadius={62} paddingAngle={2}>
                    {panelChartData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="statistics-donut-center" style={{ left: '50%', top: '42%' }}>
                <span className="statistics-donut-center__label">정상</span>
                <strong className="statistics-donut-center__value">{normalPanelRate}%</strong>
              </div>
            </div>
          ) : (
            <EmptyState message="등록된 분전반이 없습니다." />
          )}
        </BaseCard>

        <BaseCard header={<h2 className="statistics-section-title">경보 유형별 발생</h2>}>
          {alertTypeChartData.length ? (
            <div className="statistics-chart">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={alertTypeChartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={56} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="건수" fill="var(--color-brand)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="기간 내 경보가 없습니다." />
          )}
        </BaseCard>
      </div>

      <div className="statistics-half-grid">
        <BaseCard header={<h2 className="statistics-section-title">점검 현황</h2>}>
          <div className="statistics-inspection-summary">
            <div className="statistics-inspection-summary__item">
              <span className="statistics-inspection-summary__label">전체 분전반</span>
              <strong>{formatNumber(inspections?.totalPanelCount)}개</strong>
            </div>
            <div className="statistics-inspection-summary__item">
              <span className="statistics-inspection-summary__label">점검 완료</span>
              <strong>{formatNumber(inspections?.inspectedPanelCount)}개</strong>
            </div>
            <div className="statistics-inspection-summary__item">
              <span className="statistics-inspection-summary__label">미점검</span>
              <strong
                className={
                  inspections?.uninspectedPanelCount > 0 ? 'statistics-inspection-summary__value--warning' : undefined
                }
              >
                {formatNumber(inspections?.uninspectedPanelCount)}개
              </strong>
            </div>
            <div className="statistics-inspection-summary__item">
              <span className="statistics-inspection-summary__label">기간 내 점검 건수</span>
              <strong>{formatNumber(inspections?.totalInspectionCount)}건</strong>
            </div>
          </div>

          <h3 className="statistics-subsection-title">최근 점검 이력</h3>
          {inspections?.recentInspections?.length ? (
            <ul className="statistics-recent-list">
              {inspections.recentInspections.map((row, index) => (
                <li key={`${row.panelId}-${row.inspectedAt}-${index}`} className="statistics-recent-list__row">
                  <span className="statistics-recent-list__panel">{row.panelName}</span>
                  <span className="statistics-recent-list__time">{formatDateTime(row.inspectedAt)}</span>
                  <span className="statistics-recent-list__inspector">{row.inspectorName || '-'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="기간 내 점검 이력이 없습니다." />
          )}
        </BaseCard>

        <BaseCard header={<h2 className="statistics-section-title">AI 진단 현황</h2>}>
          <div className="statistics-highlight">
            <div className="statistics-highlight__top">
              <span className="statistics-highlight__title">
                진단 커버리지 <strong>{diagnosisCoverageRate}%</strong>
              </span>
              <StatusBadge
                status={arcDiagnosisCount > 0 ? 'ARC' : 'NORMAL'}
                label={`${arcDiagnosisCount > 0 ? '주의' : '정상'} ${arcRate}%`}
              />
            </div>
            <div className="statistics-progress-bar">
              <div
                className="statistics-progress-bar__fill"
                style={{ width: `${diagnosisCoverageRate}%`, background: 'var(--color-brand)' }}
              />
            </div>
            <p className="statistics-highlight__desc">
              회로 {formatNumber(diagnoses?.diagnosedCircuitCount)} / {formatNumber(diagnoses?.totalCircuitCount)}개 진단 완료 (전체{' '}
              {formatNumber(diagnoses?.totalCount)}건 판정)
            </p>

            <hr className="statistics-highlight__divider" />

            <div className="statistics-diagnosis-boxes">
              <div className="statistics-diagnosis-box">
                <div className="statistics-diagnosis-box__top">
                  <span className="statistics-diagnosis-box__label">정상</span>
                  <StatusBadge status="NORMAL" label="정상" />
                </div>
                <strong className="statistics-diagnosis-box__value">{formatNumber(normalDiagnosisCount)}건</strong>
                <div className="statistics-diagnosis-box__bar">
                  <div
                    className="statistics-diagnosis-box__bar-fill"
                    style={{ width: `${normalDiagnosisRate}%`, background: STATUS_BADGE_COLOR.NORMAL }}
                  />
                </div>
                <span className="statistics-diagnosis-box__percent">비율 {normalDiagnosisRate}%</span>
              </div>

              <div className="statistics-diagnosis-box">
                <div className="statistics-diagnosis-box__top">
                  <span className="statistics-diagnosis-box__label">아크 감지</span>
                  <StatusBadge status={arcDiagnosisCount > 0 ? 'ARC' : 'NORMAL'} label={arcDiagnosisCount > 0 ? '주의' : '정상'} />
                </div>
                <strong className="statistics-diagnosis-box__value">{formatNumber(arcDiagnosisCount)}건</strong>
                <div className="statistics-diagnosis-box__bar">
                  <div
                    className="statistics-diagnosis-box__bar-fill"
                    style={{ width: `${arcRate}%`, background: STATUS_BADGE_COLOR.ARC }}
                  />
                </div>
                <span className="statistics-diagnosis-box__percent">비율 {arcRate}%</span>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  )
}
