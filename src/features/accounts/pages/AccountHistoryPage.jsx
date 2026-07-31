import { useEffect, useMemo, useState } from 'react'
import { getUserAuditLogs, getUsers, restoreUser } from '../api/accountApi'
import Button from '@/shared/components/buttons/Button'
import DataTable from '@/shared/components/data-display/DataTable'
import Pagination from '@/shared/components/data-display/Pagination'
import ErrorState from '@/shared/components/feedback/ErrorState'
import FilterBar from '@/shared/components/layout/FilterBar'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { isoDate } from '@/shared/utils/formatters'
import './AccountHistoryPage.css'

const FIELD_LABELS = { name: '이름', email: '이메일', phone: '연락처', role: '권한' }

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

// 서버 GET /users/audit-logs는 날짜/유형 필터 파라미터가 없음(백엔드 확인됨) — 전체를 받아 화면에서 필터링
function toObject(value) {
  if (value == null) return null
  if (typeof value === 'object') return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return null
}

function formatFieldValue(field, value) {
  if (value == null || value === '') return '-'
  return field === 'role' ? (USER_ROLE_LABELS[value] ?? value) : value
}

// 변경 전/후 diff 요약 — 바뀐 필드만 표시, 파싱 실패해도 '-'만 보여주고 화면은 안 깨지게
function summarizeLog(log) {
  const before = toObject(log.beforeData)
  const after = toObject(log.afterData)

  if (log.action === 'UPDATE' && before && after) {
    const changed = Object.keys(FIELD_LABELS).filter((key) => before[key] !== after[key])
    if (changed.length === 0) return '변경사항 없음'
    return changed
      .map((key) => `${FIELD_LABELS[key]}: ${formatFieldValue(key, before[key])} → ${formatFieldValue(key, after[key])}`)
      .join(', ')
  }

  const snapshot = log.action === 'DELETE' ? before : after
  if (!snapshot) return '-'
  return Object.keys(FIELD_LABELS)
    .filter((key) => snapshot[key] !== undefined)
    .map((key) => `${FIELD_LABELS[key]}: ${formatFieldValue(key, snapshot[key])}`)
    .join(', ')
}

// SCR-407 계정 관리이력
export default function AccountHistoryPage() {
  const [logs, setLogs] = useState([])
  const [usersById, setUsersById] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [from, setFrom] = useState(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return isoDate(weekAgo)
  })
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
    return logs.filter((log) => {
      const day = log.createdAt?.slice(0, 10)
      if (from && day < from) return false
      if (to && day > to) return false
      if (actionFilter && log.action !== actionFilter) return false
      return true
    })
  }, [logs, from, to, actionFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))
  const pagedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleRestore() {
    const userId = restoreTarget
    setRestoreTarget(null)
    await restoreUser(userId)
    setRestoreResult({ message: '계정이 복구되었습니다.' })
    load()
  }

  if (loadError) return <ErrorState onRetry={load} />

  return (
    <div>
      <FilterBar>
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

      <DataTable
        loading={loading}
        rows={pagedLogs}
        rowKey={(row) => row.auditId}
        emptyMessage="조회된 이력이 없습니다."
        columns={[
          { key: 'createdAt', header: '시각', render: (row) => row.createdAt?.replace('T', ' ') ?? '-' },
          {
            key: 'targetUserId',
            header: '대상 계정',
            render: (row) => usersById[row.targetUserId]?.name ?? `#${row.targetUserId}`,
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
          { key: 'summary', header: '변경 내용', render: (row) => summarizeLog(row) },
          {
            key: 'actorUserId',
            header: '처리자',
            render: (row) => (row.actorUserId ? usersById[row.actorUserId]?.name ?? `#${row.actorUserId}` : '-'),
          },
          {
            key: 'restore',
            header: '',
            render: (row) =>
              row.action === 'DELETE' ? (
                <Button variant="secondary" onClick={() => setRestoreTarget(row.targetUserId)}>
                  복구
                </Button>
              ) : null,
          },
        ]}
      />

      <div className="account-history__pagination">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <ConfirmModal
        visible={Boolean(restoreTarget)}
        title="계정 복구"
        message="이 계정을 복구하시겠습니까?"
        confirmLabel="복구"
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />

      <ActionResultModal
        visible={Boolean(restoreResult)}
        type="success"
        title="계정 복구"
        subtitle={restoreResult?.message}
        onClose={() => setRestoreResult(null)}
      />
    </div>
  )
}
