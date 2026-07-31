import { useEffect, useMemo, useState } from 'react'
import { getUserAuditLogs, getUsers, restoreUser } from '../api/accountApi'
import { summarizeLog } from '../utils/auditLog'
import { useAuth } from '@/features/auth/useAuth'
import BaseCard from '@/shared/components/data-display/BaseCard'
import Button from '@/shared/components/buttons/Button'
import DataTable from '@/shared/components/data-display/DataTable'
import Pagination from '@/shared/components/data-display/Pagination'
import ErrorState from '@/shared/components/feedback/ErrorState'
import FilterBar from '@/shared/components/layout/FilterBar'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import TabBar from '@/shared/components/layout/TabBar'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import { formatResultDateTime, isoDate } from '@/shared/utils/formatters'
import './AccountHistoryPage.css'

// 이 화면 자체가 SUPER_ADMIN 전용 라우트라 역할 분기 없이 두 탭 모두 항상 보여준다
const TABS = [
  { label: '직원관리', to: ROUTE_PATHS.settingsAccounts, end: true },
  { label: '관리이력', to: ROUTE_PATHS.settingsAccountHistory },
]

const ACTION_OPTIONS = [
  { value: 'CREATE', label: '생성' },
  { value: 'UPDATE', label: '수정' },
  { value: 'DELETE', label: '삭제' },
  { value: 'RESTORE', label: '복구' },
  { value: 'PASSWORD_RESET', label: '비밀번호 변경' },
]

const ACTION_COLOR = {
  CREATE: 'var(--color-success)',
  UPDATE: 'var(--color-warning)',
  DELETE: 'var(--color-danger)',
  RESTORE: 'var(--color-success)',
  PASSWORD_RESET: 'var(--color-brand)',
}

const PAGE_SIZE = 13

// 기본 조회 기간(최근 7일) — 초기값과 초기화 버튼이 같은 기준을 쓰도록 함수로 뺌
function defaultFromDate() {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return isoDate(weekAgo)
}

// SCR-407 직원 관리이력. API 의미는 user audit log라 내부 데이터는 계정 감사 이력 그대로 사용한다.
export default function AccountHistoryPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [usersById, setUsersById] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [from, setFrom] = useState(defaultFromDate)
  const [to, setTo] = useState(() => isoDate(new Date()))
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [restoreResult, setRestoreResult] = useState(null)

  async function load() {
    setLoading(true)
    setLoadError(false)
    try {
      const [logData, userData] = await Promise.all([getUserAuditLogs(), getUsers()])
      setLogs(logData)
      setUsersById(Object.fromEntries(userData.map((u) => [u.userId, u])))
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 마운트 시 1회 이력+사용자 목록 조회 — load()는 재시도 버튼에서도 재사용
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const filteredLogs = useMemo(() => {
    const hasDateFilter = Boolean(from || to)
    return logs.filter((log) => {
      const day = log.createdAt?.slice(0, 10)
      // 날짜 필터를 쓰는데 createdAt이 없으면 어느 기간에도 안 걸리는 게 맞음 — 필터 미사용 시에는 그대로 노출
      if (hasDateFilter && !day) return false
      if (from && day < from) return false
      if (to && day > to) return false
      if (actionFilter && log.action !== actionFilter) return false
      return true
    })
  }, [logs, from, to, actionFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))
  // 복구/필터 변경으로 목록이 줄어 page가 범위를 벗어나도 렌더 시점에 바로 보정 — 별도 setState/effect 불필요
  const currentPage = Math.min(page, totalPages)
  const pagedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleReset() {
    setFrom(defaultFromDate())
    setTo(isoDate(new Date()))
    setActionFilter('')
    setPage(1)
  }

  async function handleRestore() {
    const userId = restoreTarget
    const targetName = usersById[userId]?.name ?? `#${userId}`
    setRestoreTarget(null)
    await restoreUser(userId)
    setRestoreResult({ name: targetName })
    load()
  }

  if (loadError) return <ErrorState onRetry={load} />

  return (
    <div className="account-history">
      <p className="account-history__notice">
        직원관리에서 이뤄진 등록·수정·삭제·복구 기록입니다. 삭제된 직원은 이 화면에서만 복구할 수 있습니다.
      </p>

      <BaseCard className="card--filter">
        <TabBar tabs={TABS} />
        <FilterBar onReset={handleReset}>
          <Input
            type="date"
            label="시작일"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
          />
          <Input
            type="date"
            label="종료일"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
          />
          <Select
            label="이력 유형"
            placeholder="전체"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
            options={ACTION_OPTIONS}
          />
        </FilterBar>
      </BaseCard>

      {/* 표 자체 테두리가 "표+페이지네이션" 세트의 경계 — 감싸는 카드를 따로 두지 않는다 */}
      <DataTable
        loading={loading}
        rows={pagedLogs}
        rowKey={(row) => row.auditId}
        emptyMessage="조회된 이력이 없습니다."
        emptyDescription="기간을 넓히거나 이력 유형을 전체로 바꿔보세요."
        columns={[
          {
            key: 'createdAt',
            header: '시각',
            className: 'account-history__time-cell',
            render: (row) => row.createdAt?.replace('T', ' ') ?? '-',
          },
          {
            key: 'targetUserId',
            header: '대상 직원',
            render: (row) => usersById[row.targetUserId]?.name ?? `#${row.targetUserId}`,
          },
          {
            key: 'action',
            header: '구분',
            render: (row) => (
              <span
                className="badge"
                style={{ color: ACTION_COLOR[row.action], background: 'var(--color-surface-muted)' }}
              >
                {row.actionLabel}
              </span>
            ),
          },
          {
            key: 'summary',
            header: '변경 내용',
            className: 'account-history__summary-cell',
            render: (row) => summarizeLog(row),
          },
          {
            key: 'actorUserId',
            header: '처리자',
            render: (row) => (row.actorUserId ? usersById[row.actorUserId]?.name ?? `#${row.actorUserId}` : '-'),
          },
          {
            key: 'restore',
            header: '복구',
            className: 'account-history__restore-cell',
            render: (row) =>
              row.action === 'DELETE' ? (
                <Button variant="secondary" onClick={() => setRestoreTarget(row.targetUserId)}>
                  복구
                </Button>
              ) : null,
          },
        ]}
      />

      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />

      <ConfirmModal
        visible={Boolean(restoreTarget)}
        title="직원 복구"
        message="이 직원을 복구하시겠습니까?"
        confirmLabel="복구"
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />

      <ActionResultModal
        visible={Boolean(restoreResult)}
        type="success"
        title="복구가 완료되었습니다."
        subtitle="삭제되었던 직원 계정이 복구되었습니다."
        infoRows={[
          { label: '처리 항목', value: restoreResult?.name },
          { label: '처리 시각', value: formatResultDateTime() },
          { label: '처리 내용', value: '직원 복구' },
          { label: '처리자', value: user?.name },
        ]}
        onClose={() => setRestoreResult(null)}
      />
    </div>
  )
}
