import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bulkDeleteUsers, getManagedUsers, getStaffContacts } from '../api/accountApi'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import DataTable from '@/shared/components/data-display/DataTable'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import ErrorState from '@/shared/components/feedback/ErrorState'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import FilterBar from '@/shared/components/layout/FilterBar'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { ROLES } from '@/shared/constants/roles'
import { ROUTE_PATHS, buildPath } from '@/shared/constants/routePaths'
import './AccountListPage.css'

const ROLE_FILTER_OPTIONS = [
  { value: ROLES.ADMIN, label: USER_ROLE_LABELS[ROLES.ADMIN] },
  { value: ROLES.GENERAL, label: USER_ROLE_LABELS[ROLES.GENERAL] },
]

function includesText(value, keyword) {
  return String(value ?? '').toLowerCase().includes(keyword)
}

function formatPhone(phone) {
  return phone || '-'
}

// SCR-404 직원관리 — 현재 선택 현장 기준으로 역할별 데이터 소스를 분리한다.
export default function AccountListPage() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { currentSiteId } = useSite()
  const requestSeqRef = useRef(0)

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteResult, setDeleteResult] = useState(null)

  const isContactMode = role === ROLES.GENERAL
  const canManageStaff = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN

  const load = useCallback(async () => {
    const siteId = currentSiteId
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq

    setUsers([])
    setSelectedIds([])

    if (!siteId) {
      setLoading(false)
      setLoadError('직원관리 화면은 현장 선택 후 이용할 수 있습니다.')
      return
    }

    setLoading(true)
    setLoadError('')
    try {
      const data = isContactMode ? await getStaffContacts(siteId) : await getManagedUsers(siteId)
      if (requestSeqRef.current !== seq) return
      setUsers(data)
    } catch (error) {
      if (requestSeqRef.current !== seq) return
      const status = error?.response?.status
      setLoadError(status === 403 ? '현재 현장의 직원 정보를 조회할 권한이 없습니다.' : '직원 정보를 불러오지 못했습니다.')
    } finally {
      if (requestSeqRef.current === seq) setLoading(false)
    }
  }, [currentSiteId, isContactMode])

  useEffect(() => {
    // 현장/역할이 바뀌면 이전 현장 데이터가 잠시라도 남지 않게 즉시 비우고 다시 조회한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return () => {
      requestSeqRef.current += 1
    }
  }, [load])

  function toggleSelect(userId) {
    setSelectedIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.length === filteredUsers.length ? [] : filteredUsers.map((u) => u.userId)))
  }

  async function handleBulkDelete() {
    const count = selectedIds.length
    await bulkDeleteUsers(selectedIds) // 실패(자기자신/권한밖 포함 등)는 전역 알림이 처리 — 여기선 성공만 다룸
    setDeleteConfirmOpen(false)
    setDeleteResult({ message: `직원 ${count}건이 삭제되었습니다.` })
    load()
  }

  const actions = useMemo(
    () =>
      canManageStaff ? (
        <>
          {role === ROLES.SUPER_ADMIN && (
            <Button variant="secondary" onClick={() => navigate(ROUTE_PATHS.settingsAccountHistory)}>
              관리이력
            </Button>
          )}
          <Button variant="primary" onClick={() => navigate(ROUTE_PATHS.settingsAccountAdd)}>
            직원 추가
          </Button>
        </>
      ) : null,
    [canManageStaff, navigate, role],
  )
  usePageActions(actions)

  const normalizedKeyword = keyword.trim().toLowerCase()
  const filteredUsers = users.filter((user) => {
    if (normalizedKeyword) {
      const matchesKeyword = isContactMode
        ? includesText(user.name, normalizedKeyword) || includesText(user.phone, normalizedKeyword)
        : includesText(user.name, normalizedKeyword) ||
          includesText(user.email, normalizedKeyword) ||
          includesText(user.phone, normalizedKeyword)
      if (!matchesKeyword) return false
    }
    if (roleFilter && user.role !== roleFilter) return false
    return true
  })

  const columns = useMemo(() => {
    if (isContactMode) {
      return [
        { key: 'name', header: '이름' },
        {
          key: 'phone',
          header: '연락처',
          render: (row) =>
            row.phone ? (
              <a className="account-list__tel" href={`tel:${row.phone}`}>
                {row.phone}
              </a>
            ) : (
              '-'
            ),
        },
        { key: 'role', header: '역할', render: (row) => USER_ROLE_LABELS[row.role] ?? row.role },
        { key: 'siteName', header: '현장명', render: (row) => row.siteName ?? '-' },
      ]
    }

    return [
      { key: 'name', header: '이름' },
      { key: 'email', header: '이메일' },
      { key: 'phone', header: '연락처', render: (row) => formatPhone(row.phone) },
      { key: 'role', header: '역할', render: (row) => USER_ROLE_LABELS[row.role] ?? row.role },
      { key: 'createdAt', header: '가입일', render: (row) => row.createdAt?.slice(0, 10) ?? '-' },
    ]
  }, [isContactMode])

  const roleFilterOptions = role === ROLES.SUPER_ADMIN ? ROLE_FILTER_OPTIONS : ROLE_FILTER_OPTIONS.filter((option) => option.value !== ROLES.ADMIN)
  const emptyMessage = isContactMode ? '현재 현장의 직원 연락망이 없습니다.' : '현재 현장에 등록된 직원이 없습니다.'

  if (loadError) return <ErrorState message={loadError} onRetry={load} />

  return (
    <div>
      <FilterBar
        actions={
          canManageStaff ? (
            <Button variant="danger" disabled={selectedIds.length === 0} onClick={() => setDeleteConfirmOpen(true)}>
              선택 삭제 ({selectedIds.length})
            </Button>
          ) : null
        }
      >
        <Input
          label="검색"
          placeholder={isContactMode ? '이름 또는 연락처' : '이름, 이메일 또는 연락처'}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Select
          label="역할"
          placeholder="전체"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          options={roleFilterOptions}
        />
      </FilterBar>

      <DataTable
        loading={loading}
        rows={filteredUsers}
        rowKey={(row) => row.userId}
        onRowClick={
          canManageStaff ? (row) => navigate(buildPath(ROUTE_PATHS.settingsAccountEdit, { userId: row.userId })) : undefined
        }
        selection={
          canManageStaff
            ? {
                selectedKeys: selectedIds,
                allSelected: filteredUsers.length > 0 && selectedIds.length === filteredUsers.length,
                onToggle: toggleSelect,
                onToggleAll: toggleSelectAll,
              }
            : undefined
        }
        emptyMessage={emptyMessage}
        columns={columns}
      />

      <ConfirmModal
        visible={deleteConfirmOpen}
        title="직원 삭제"
        message={`선택한 직원 ${selectedIds.length}건을 삭제하시겠습니까?`}
        danger
        confirmLabel="삭제"
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <ActionResultModal
        visible={Boolean(deleteResult)}
        type="success"
        title="삭제 완료"
        subtitle={deleteResult?.message}
        onClose={() => setDeleteResult(null)}
      />
    </div>
  )
}
