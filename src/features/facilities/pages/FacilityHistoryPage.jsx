import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFacilityAuditLogs } from '../api/facilityApi'
import FacilityAuditLogDetailModal from '../components/FacilityAuditLogDetailModal'
import { ACTION_COLOR, resolveTargetName } from '../utils/facilityAuditLog'
import { getUsers } from '@/features/accounts/api/accountApi'
import BaseCard from '@/shared/components/data-display/BaseCard'
import DataTable from '@/shared/components/data-display/DataTable'
import Pagination from '@/shared/components/data-display/Pagination'
import ErrorState from '@/shared/components/feedback/ErrorState'
import FilterBar from '@/shared/components/layout/FilterBar'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import { isoDate } from '@/shared/utils/formatters'
import './FacilityHistoryPage.css'

const TARGET_TYPE_OPTIONS = [
  { value: 'SITE', label: '현장' },
  { value: 'PANEL', label: '분전반' },
  { value: 'CIRCUIT', label: '회로' },
]

const ACTION_OPTIONS = [
  { value: 'CREATE', label: '등록' },
  { value: 'UPDATE', label: '수정' },
  { value: 'DELETE', label: '삭제' },
]

const PAGE_SIZE = 11

// 기본 조회 기간(최근 7일) — 초기값과 초기화 버튼이 같은 기준을 쓰도록 함수로 뺌
function defaultFromDate() {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return isoDate(weekAgo)
}

// SCR-503 설비 변경 이력. SUPER_ADMIN 전용, 현장 스코프 없이 전체 현장/분전반/회로 변경을 다룬다.
// API가 필터/페이지네이션을 서버에서 처리해서 프론트는 요청만 넘기고 화면 계산은 하지 않는다.
export default function FacilityHistoryPage() {
  const [logs, setLogs] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [usersById, setUsersById] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [from, setFrom] = useState(defaultFromDate)
  const [to, setTo] = useState(() => isoDate(new Date()))
  const [targetType, setTargetType] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [logData, userData] = await Promise.all([
        getFacilityAuditLogs({ targetType: targetType || undefined, action: action || undefined, from, to, page: page - 1, size: PAGE_SIZE }),
        getUsers(),
      ])
      setLogs(logData.content)
      setTotalElements(logData.totalElements)
      setUsersById(Object.fromEntries(userData.map((u) => [u.userId, u])))
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [targetType, action, from, to, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))

  function handleReset() {
    setFrom(defaultFromDate())
    setTo(isoDate(new Date()))
    setTargetType('')
    setAction('')
    setPage(1)
  }

  function actorName(log) {
    return log.actorUserId ? usersById[log.actorUserId]?.name ?? `#${log.actorUserId}` : '-'
  }

  if (loadError) return <ErrorState onRetry={load} />

  return (
    <div className="facility-history">
      <BaseCard className="card--filter">
        <nav className="tab-bar" aria-label="설비 관리 탭">
          <Link to={ROUTE_PATHS.settingsFacilities} className="tab-bar__tab">
            분전반 관리
          </Link>
          <Link to={`${ROUTE_PATHS.settingsFacilities}?tab=circuits`} className="tab-bar__tab">
            회로 관리
          </Link>
          <span className="tab-bar__tab is-active" aria-current="page">
            변경 이력
          </span>
        </nav>
        <FilterBar onReset={handleReset}>
          <span className="facility-history__date-label">검색일</span>
          <Input
            type="date"
            aria-label="검색 시작일"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
          />
          <span className="facility-history__date-sep" aria-hidden="true">
            ~
          </span>
          <Input
            type="date"
            aria-label="검색 종료일"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
          />
          <Select
            aria-label="대상"
            placeholder="대상"
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value)
              setPage(1)
            }}
            options={TARGET_TYPE_OPTIONS}
          />
          <Select
            aria-label="유형"
            placeholder="유형"
            value={action}
            onChange={(e) => {
              setAction(e.target.value)
              setPage(1)
            }}
            options={ACTION_OPTIONS}
          />
        </FilterBar>
      </BaseCard>

      <DataTable
        loading={loading}
        rows={logs}
        rowKey={(row) => row.auditId}
        onRowClick={(row) => setSelectedLog(row)}
        emptyMessage="조회된 이력이 없습니다."
        emptyDescription="기간을 넓히거나 필터를 전체로 바꿔보세요."
        columns={[
          {
            key: 'createdAt',
            header: '시각',
            className: 'facility-history__time-cell',
            render: (row) => row.createdAt?.replace('T', ' ') ?? '-',
          },
          {
            key: 'targetTypeLabel',
            header: '대상',
            render: (row) => `${row.targetTypeLabel} · ${resolveTargetName(row)}`,
          },
          {
            key: 'action',
            header: '구분',
            render: (row) => (
              <span className="badge" style={{ color: ACTION_COLOR[row.action], background: 'var(--color-surface-muted)' }}>
                {row.actionLabel}
              </span>
            ),
          },
          {
            key: 'actorUserId',
            header: '처리자',
            render: actorName,
          },
        ]}
      />

      {!loading && logs.length > 0 && (
        <div className="facility-history__footer">
          <p className="facility-history__count">총 {totalElements}건 중 조회</p>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <FacilityAuditLogDetailModal
        visible={Boolean(selectedLog)}
        log={selectedLog}
        targetName={selectedLog ? resolveTargetName(selectedLog) : ''}
        actorName={selectedLog ? actorName(selectedLog) : '-'}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  )
}
