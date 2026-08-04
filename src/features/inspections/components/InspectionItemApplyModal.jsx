import { useEffect, useState } from 'react'
import Button from '@/shared/components/buttons/Button'
import DataTable from '@/shared/components/data-display/DataTable'
import Input from '@/shared/components/forms/Input'
import BaseModal from '@/shared/components/modals/BaseModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'

const EMPTY_NEW_ITEM = { itemName: '', description: '' }

// 분전반에 적용할 점검 항목을 현장 카탈로그에서 골라 전체교체로 저장하는 모달.
// ADMIN 이상은 이 안에서 카탈로그 항목을 등록/수정/삭제까지 바로 처리한다.
export default function InspectionItemApplyModal({
  visible,
  panel,
  siteItems,
  appliedItemIds,
  canManageItems,
  saving,
  onSubmit,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onClose,
}) {
  const [selectedIds, setSelectedIds] = useState([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [addFormOpen, setAddFormOpen] = useState(false)
  const [newItem, setNewItem] = useState(EMPTY_NEW_ITEM)
  const [newItemError, setNewItemError] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingItemId, setEditingItemId] = useState(null)
  const [editDraft, setEditDraft] = useState(EMPTY_NEW_ITEM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(appliedItemIds ?? [])
    setAddFormOpen(false)
    setNewItem(EMPTY_NEW_ITEM)
    setNewItemError('')
    setEditingItemId(null)
  }, [visible, appliedItemIds])

  function toggleItem(itemId) {
    setSelectedIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  function toggleAll() {
    const allIds = (siteItems ?? []).map((item) => item.itemId)
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : allIds)
  }

  async function handleConfirm() {
    setConfirmOpen(false)
    await onSubmit(selectedIds)
  }

  // 인라인 항목 등록 — 등록되면 목록에 바로 나타나고, 방금 등록한 항목은 자동으로 체크한다(등록 목적이 곧 적용이라)
  async function handleCreateItem() {
    if (!newItem.itemName.trim()) {
      setNewItemError('점검 항목명을 입력해주세요.')
      return
    }
    setCreating(true)
    try {
      const itemId = await onCreateItem({
        itemName: newItem.itemName.trim(),
        description: newItem.description.trim() || null,
      })
      setSelectedIds((prev) => (itemId ? [...prev, itemId] : prev))
      setAddFormOpen(false)
      setNewItem(EMPTY_NEW_ITEM)
      setNewItemError('')
    } catch (error) {
      setNewItemError(error?.response?.data?.resultMessage || '점검 항목을 등록하지 못했습니다.')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(item) {
    setEditingItemId(item.itemId)
    setEditDraft({ itemName: item.itemName, description: item.description ?? '' })
    setEditError('')
  }

  async function handleSaveEdit(itemId) {
    if (!editDraft.itemName.trim()) {
      setEditError('점검 항목명을 입력해주세요.')
      return
    }
    setEditSaving(true)
    try {
      await onUpdateItem(itemId, {
        itemName: editDraft.itemName.trim(),
        description: editDraft.description.trim() || null,
      })
      setEditingItemId(null)
    } catch (error) {
      setEditError(error?.response?.data?.resultMessage || '점검 항목을 수정하지 못했습니다.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleConfirmDelete() {
    setDeleteError('')
    try {
      await onDeleteItem(deleteTarget.itemId)
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.itemId))
      setDeleteTarget(null)
    } catch (error) {
      setDeleteError(error?.response?.data?.resultMessage || '점검 항목을 삭제하지 못했습니다.')
    }
  }

  const allIds = (siteItems ?? []).map((item) => item.itemId)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id))

  const columns = [
    {
      key: 'itemName',
      header: '항목명',
      render: (item) =>
        editingItemId === item.itemId ? (
          <Input
            className="inspection-inline-input"
            value={editDraft.itemName}
            onChange={(event) => setEditDraft((prev) => ({ ...prev, itemName: event.target.value }))}
          />
        ) : (
          item.itemName
        ),
    },
    {
      key: 'description',
      header: '설명',
      render: (item) =>
        editingItemId === item.itemId ? (
          <Input
            className="inspection-inline-input"
            value={editDraft.description}
            onChange={(event) => setEditDraft((prev) => ({ ...prev, description: event.target.value }))}
          />
        ) : (
          item.description || '-'
        ),
    },
    ...(canManageItems
      ? [
          {
            key: 'manage',
            header: '관리',
            render: (item) =>
              editingItemId === item.itemId ? (
                <div className="inspection-apply-table__actions">
                  <Button className="inspection-btn--sm" variant="secondary" onClick={() => setEditingItemId(null)}>
                    취소
                  </Button>
                  <Button className="inspection-btn--sm" variant="primary" loading={editSaving} onClick={() => handleSaveEdit(item.itemId)}>
                    저장
                  </Button>
                </div>
              ) : (
                <div className="inspection-apply-table__actions">
                  <Button className="inspection-btn--sm" variant="secondary" onClick={() => startEdit(item)}>
                    수정
                  </Button>
                  <Button className="inspection-btn--sm" variant="danger" onClick={() => setDeleteTarget(item)}>
                    삭제
                  </Button>
                </div>
              ),
          },
        ]
      : []),
  ]

  return (
    <>
      <BaseModal
        visible={visible}
        onClose={onClose}
        title="점검 항목 관리"
        className="facility-modal inspection-modal"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button variant="primary" loading={saving} onClick={() => setConfirmOpen(true)}>
              저장
            </Button>
          </>
        }
      >
        <div className="inspection-apply-header">
          <h4 className="inspection-apply-header__title">점검 항목</h4>
          {canManageItems && !addFormOpen && (
            <Button className="inspection-btn--sm" variant="secondary" onClick={() => setAddFormOpen(true)}>
              + 항목 추가
            </Button>
          )}
        </div>
        {editError && (
          <p className="banner banner-danger" role="alert">
            {editError}
          </p>
        )}
        <div className="inspection-apply-table">
          <DataTable
            rows={siteItems ?? []}
            rowKey={(item) => item.itemId}
            columns={columns}
            emptyMessage="현장에 등록된 점검 항목이 없습니다."
            emptyDescription={canManageItems ? '+ 항목 추가 버튼으로 먼저 등록해주세요.' : '관리자가 항목을 먼저 등록해야 합니다.'}
            selection={{ selectedKeys: selectedIds, allSelected, onToggle: toggleItem, onToggleAll: toggleAll }}
          />
        </div>

        {addFormOpen && (
          <div className="inspection-add-item-form">
            {newItemError && (
              <p className="banner banner-danger" role="alert">
                {newItemError}
              </p>
            )}
            <Input
              label="항목명"
              requiredMark
              placeholder="예: 누전차단기 동작 확인"
              value={newItem.itemName}
              onChange={(event) => setNewItem((prev) => ({ ...prev, itemName: event.target.value }))}
            />
            <Input
              label="설명"
              placeholder="예: 테스트 버튼으로 정상 차단되는지 확인 (선택)"
              value={newItem.description}
              onChange={(event) => setNewItem((prev) => ({ ...prev, description: event.target.value }))}
            />
            <div className="inspection-add-item-form__actions">
              <Button
                className="inspection-btn--sm"
                variant="secondary"
                onClick={() => {
                  setAddFormOpen(false)
                  setNewItem(EMPTY_NEW_ITEM)
                  setNewItemError('')
                }}
              >
                취소
              </Button>
              <Button className="inspection-btn--sm" variant="primary" loading={creating} onClick={handleCreateItem}>
                항목 등록
              </Button>
            </div>
          </div>
        )}
      </BaseModal>

      <ConfirmModal
        visible={confirmOpen}
        title="점검 항목 적용"
        confirmLabel="적용"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      >
        <div className="confirm-modal__summary confirm-modal__summary--neutral">
          <span className="confirm-modal__summary-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="confirm-modal__summary-body">
            <p className="confirm-modal__summary-row">
              <span className="confirm-modal__summary-label">대상 분전반</span>
              <span className="confirm-modal__summary-value">{panel?.name ?? '-'}</span>
              <span className="confirm-modal__summary-badge">적용 {selectedIds.length}건</span>
            </p>
            <p className="confirm-modal__summary-detail">선택한 항목으로 이 분전반의 점검 항목이 교체됩니다.</p>
          </div>
        </div>
      </ConfirmModal>

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title="점검 항목 삭제"
        danger
        confirmLabel="삭제"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError('')
        }}
      >
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
              <span className="confirm-modal__summary-label">점검 항목</span>
              <span className="confirm-modal__summary-value">{deleteTarget?.itemName}</span>
              <span className="confirm-modal__summary-badge">삭제</span>
            </p>
            <p className="confirm-modal__summary-detail">이미 분전반에 적용됐거나 점검 결과에 쓰인 항목은 삭제할 수 없습니다.</p>
          </div>
        </div>
        {deleteError && (
          <p className="banner banner-danger" role="alert">
            {deleteError}
          </p>
        )}
      </ConfirmModal>
    </>
  )
}
