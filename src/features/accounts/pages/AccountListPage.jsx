import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bulkDeleteUsers, getUsers } from '../api/accountApi'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import Button from '@/shared/components/buttons/Button'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import DataTable from '@/shared/components/data-display/DataTable'
import ErrorState from '@/shared/components/feedback/ErrorState'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { ROUTE_PATHS, buildPath } from '@/shared/constants/routePaths'
import './AccountListPage.css'

// SCR-404 계정 목록 — 삭제 계정은 GET /users 자체가 안 내려줌(백엔드 확인됨)
export default function AccountListPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteResult, setDeleteResult] = useState(null)

  async function load() {
    setLoading(true)
    setLoadError(false)
    try {
      const data = await getUsers()
      setUsers(data)
      setSelectedIds([])
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 마운트 시 1회 목록 조회 — load()는 재시도 버튼에서도 재사용
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  function toggleSelect(userId) {
    setSelectedIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.length === users.length ? [] : users.map((u) => u.userId)))
  }

  async function handleBulkDelete() {
    const count = selectedIds.length
    await bulkDeleteUsers(selectedIds) // 실패(자기자신/권한밖 포함 등)는 전역 알림이 처리 — 여기선 성공만 다룸
    setDeleteConfirmOpen(false)
    setDeleteResult({ message: `계정 ${count}건이 삭제되었습니다.` })
    load()
  }

  const actions = useMemo(
    () => (
      <>
        <Button variant="secondary" onClick={() => navigate(ROUTE_PATHS.settingsAccountHistory)}>
          관리이력
        </Button>
        <Button variant="primary" onClick={() => navigate(ROUTE_PATHS.settingsAccountAdd)}>
          계정 추가
        </Button>
      </>
    ),
    [navigate],
  )
  usePageActions(actions)

  if (loadError) return <ErrorState onRetry={load} />

  return (
    <div>
      <div className="account-list__toolbar">
        <Button variant="danger" disabled={selectedIds.length === 0} onClick={() => setDeleteConfirmOpen(true)}>
          선택 삭제 ({selectedIds.length})
        </Button>
      </div>

      <DataTable
        loading={loading}
        rows={users}
        rowKey={(row) => row.userId}
        onRowClick={(row) => navigate(buildPath(ROUTE_PATHS.settingsAccountEdit, { userId: row.userId }))}
        selection={{
          selectedKeys: selectedIds,
          allSelected: users.length > 0 && selectedIds.length === users.length,
          onToggle: toggleSelect,
          onToggleAll: toggleSelectAll,
        }}
        emptyMessage="등록된 계정이 없습니다."
        columns={[
          { key: 'name', header: '이름' },
          { key: 'email', header: '이메일' },
          { key: 'phone', header: '연락처' },
          { key: 'role', header: '권한', render: (row) => USER_ROLE_LABELS[row.role] ?? row.role },
          { key: 'createdAt', header: '가입일', render: (row) => row.createdAt?.slice(0, 10) ?? '-' },
        ]}
      />

      <ConfirmModal
        visible={deleteConfirmOpen}
        title="계정 삭제"
        message={`선택한 계정 ${selectedIds.length}건을 삭제하시겠습니까?`}
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
