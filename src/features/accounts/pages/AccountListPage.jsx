import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { bulkDeleteUsers, getManagedUsers } from '../api/accountApi'
import AccountCreateModal from '../components/AccountCreateModal'
import AccountDetailModal from '../components/AccountDetailModal'
import { useAuth } from '@/features/auth/useAuth'
import { useSite } from '@/features/sites/useSite'
import { usePageActions } from '@/layouts/DefaultLayout/usePageActions'
import BaseCard from '@/shared/components/data-display/BaseCard'
import Button from '@/shared/components/buttons/Button'
import DataTable from '@/shared/components/data-display/DataTable'
import Pagination from '@/shared/components/data-display/Pagination'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import ErrorState from '@/shared/components/feedback/ErrorState'
import Input from '@/shared/components/forms/Input'
import Select from '@/shared/components/forms/Select'
import FilterBar from '@/shared/components/layout/FilterBar'
import TabBar from '@/shared/components/layout/TabBar'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { ROLES } from '@/shared/constants/roles'
import { ROUTE_PATHS } from '@/shared/constants/routePaths'
import { formatResultDateTime } from '@/shared/utils/formatters'
import './AccountListPage.css'

const ROLE_FILTER_OPTIONS = [
  { value: ROLES.ADMIN, label: USER_ROLE_LABELS[ROLES.ADMIN] },
  { value: ROLES.GENERAL, label: USER_ROLE_LABELS[ROLES.GENERAL] },
]

const PAGE_SIZE = 11

function formatPhone(phone) {
  return phone || '-'
}

// SCR-404 직원관리 — 현재 선택 현장의 managed-users를 역할 공통 조회 API로 사용한다.
export default function AccountListPage() {
  const { user, role } = useAuth()
  const { currentSiteId } = useSite()
  const requestSeqRef = useRef(0)

  const [users, setUsers] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteResult, setDeleteResult] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailUser, setDetailUser] = useState(null)

  const canManageStaff = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN

  // 검색어/권한 필터/페이지는 서버가 필터·페이징한다(API-521)
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
      const data = await getManagedUsers(siteId, {
        keyword: keyword.trim() || undefined,
        role: roleFilter || undefined,
        page: page - 1,
        size: PAGE_SIZE,
      })
      if (requestSeqRef.current !== seq) return
      setUsers(data?.content ?? [])
      setTotalElements(Number(data?.totalElements ?? 0))
    } catch (error) {
      if (requestSeqRef.current !== seq) return
      const status = error?.response?.status
      setLoadError(status === 403 ? '현재 현장의 직원 정보를 조회할 권한이 없습니다.' : '직원 정보를 불러오지 못했습니다.')
    } finally {
      if (requestSeqRef.current === seq) setLoading(false)
    }
  }, [currentSiteId, keyword, roleFilter, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return () => {
      requestSeqRef.current += 1
    }
  }, [load])

  useEffect(() => {
    // 현장이 바뀌면 검색어/필터/페이지도 새 현장 기준으로 초기화한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKeyword('')
    setRoleFilter('')
    setPage(1)
  }, [currentSiteId])

  function toggleSelect(userId) {
    setSelectedIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  // "전체 선택"은 필터 전체가 아니라 지금 보이는 페이지 기준(일반적인 테이블 UX와 동일)
  function toggleSelectAll() {
    const pageIds = users.map((u) => u.userId)
    const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
    setSelectedIds((prev) =>
      allChecked ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])],
    )
  }

  async function handleBulkDelete() {
    const count = selectedIds.length
    await bulkDeleteUsers(selectedIds) // 실패(자기자신/권한밖 포함 등)는 전역 알림이 처리 — 여기선 성공만 다룸
    setDeleteConfirmOpen(false)
    setDeleteResult({ count })
    load()
  }

  // 관리이력 이동은 탭바로 옮겨서, 헤더에는 등록처럼 즉시 실행되는 액션만 남긴다
  const actions = useMemo(
    () =>
      canManageStaff ? (
        <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
          직원 등록
        </Button>
      ) : null,
    [canManageStaff],
  )
  usePageActions(actions)

  const tabs = useMemo(
    () =>
      role === ROLES.SUPER_ADMIN
        ? [
            { label: '직원관리', to: ROUTE_PATHS.settingsAccounts, end: true },
            { label: '관리이력', to: ROUTE_PATHS.settingsAccountHistory },
          ]
        : [],
    [role],
  )

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))

  // 읽기 전용 사용자에게 가입일은 연락처 확인에 쓸모가 없어 열 자체를 뺀다
  const columns = useMemo(() => {
    const base = [
      { key: 'name', header: '이름', className: 'account-list__name-cell' },
      { key: 'email', header: '이메일' },
      { key: 'phone', header: '연락처', render: (row) => formatPhone(row.phone) },
      { key: 'role', header: '권한', render: (row) => USER_ROLE_LABELS[row.role] ?? row.role },
    ]
    if (!canManageStaff) return base
    return [...base, { key: 'createdAt', header: '가입일', render: (row) => row.createdAt?.slice(0, 10) ?? '-' }]
  }, [canManageStaff])

  const roleFilterOptions = ROLE_FILTER_OPTIONS
  const emptyMessage = '현재 현장에 등록된 직원이 없습니다.'
  const emptyDescription = canManageStaff ? '직원 등록 버튼을 눌러 이 현장에서 근무할 직원을 추가해주세요.' : undefined

  if (loadError) return <ErrorState message={loadError} onRetry={load} />

  return (
    <div className="account-list">
      <BaseCard className="card--filter">
        {/* 탭이 1개 이하면(SUPER_ADMIN 아니면 관리이력 탭 자체가 없음) TabBar가 알아서 아무것도 렌더하지 않는다 */}
        <TabBar tabs={tabs} />
        <FilterBar
          onReset={() => {
            setKeyword('')
            setRoleFilter('')
            setPage(1)
          }}
          actions={
            canManageStaff ? (
              <Button variant="danger" disabled={selectedIds.length === 0} onClick={() => setDeleteConfirmOpen(true)}>
                선택 삭제 ({selectedIds.length})
              </Button>
            ) : null
          }
        >
          <Input
            aria-label="직원 검색"
            placeholder="이름, 이메일 또는 연락처"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
          />
          <Select
            aria-label="권한"
            placeholder="권한"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value)
              setPage(1)
            }}
            options={roleFilterOptions}
          />
        </FilterBar>
      </BaseCard>

      {/* 표 자체 테두리가 "표+페이지네이션" 세트의 경계 — 감싸는 카드를 따로 두지 않는다 */}
      <DataTable
        loading={loading}
        rows={users}
        rowKey={(row) => row.userId}
        onRowClick={(row) => setDetailUser(row)}
        selection={
          canManageStaff
            ? {
                selectedKeys: selectedIds,
                allSelected: users.length > 0 && users.every((u) => selectedIds.includes(u.userId)),
                onToggle: toggleSelect,
                onToggleAll: toggleSelectAll,
              }
            : undefined
        }
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        columns={columns}
      />

      {!loading && totalElements > 0 && (
        <div className="account-list__footer">
          <p className="account-list__count">총 {totalElements}건 중 {users.length}건 조회</p>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <ConfirmModal
        visible={deleteConfirmOpen}
        title="직원 삭제"
        message="선택한 직원을 삭제하시겠습니까?"
        danger
        confirmLabel="삭제"
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      >
        {/* 여러 명을 한 번에 지울 수 있어 이름을 전부 나열하지 않고 건수만 강조 */}
        <div className="confirm-modal__summary">
          <span className="confirm-modal__summary-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="confirm-modal__summary-body">
            <p className="confirm-modal__summary-row">
              <span className="confirm-modal__summary-label">대상</span>
              <span className="confirm-modal__summary-value">{selectedIds.length}건</span>
              <span className="confirm-modal__summary-badge">삭제</span>
            </p>
            <p className="confirm-modal__summary-detail">선택한 직원 전체가 삭제됩니다.</p>
          </div>
        </div>
      </ConfirmModal>

      <ActionResultModal
        visible={Boolean(deleteResult)}
        type="success"
        title="삭제가 완료되었습니다."
        subtitle="선택한 직원이 삭제되었습니다."
        infoRows={[
          { label: '삭제 항목', value: `${deleteResult?.count}건` },
          { label: '삭제 시각', value: formatResultDateTime() },
          { label: '삭제자', value: user?.name },
        ]}
        onClose={() => setDeleteResult(null)}
      />

      <AccountCreateModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={load}
      />

      <AccountDetailModal
        visible={Boolean(detailUser)}
        user={detailUser}
        onClose={() => setDetailUser(null)}
        onChanged={load}
      />
    </div>
  )
}
