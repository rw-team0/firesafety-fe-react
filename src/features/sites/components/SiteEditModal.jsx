import { useEffect, useState } from 'react'
import { deleteSite, updateSite } from '../api/siteApi'
import { useAuth } from '@/features/auth/useAuth'
import Button from '@/shared/components/buttons/Button'
import Input from '@/shared/components/forms/Input'
import BaseModal from '@/shared/components/modals/BaseModal'
import ActionResultModal from '@/shared/components/modals/ActionResultModal'
import ConfirmModal from '@/shared/components/modals/ConfirmModal'
import AddressSearchModal from './AddressSearchModal'
import { formatResultDateTime } from '@/shared/utils/formatters'
import '../pages/sitePageShell.css'
import '@/features/accounts/components/AccountModal.css'

// 현장 정보 수정 — 페이지 대신 모달로. 최초 관리자 계정은 수정 대상 아님(백엔드 SiteUpdateReq에 name/address/addressDetail/zipCode만 있음)
export default function SiteEditModal({ visible, site, onClose, onUpdated, onDeleted }) {
  const { user } = useAuth()

  const [form, setForm] = useState({ name: '', address: '', addressDetail: '', zipCode: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteResult, setDeleteResult] = useState(null)
  const [addressSearchOpen, setAddressSearchOpen] = useState(false)

  useEffect(() => {
    if (!visible || !site) return
    // 모달을 열 때마다 대상 현장 값으로 다시 채움
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      name: site.name ?? '',
      address: site.address ?? '',
      addressDetail: site.addressDetail ?? '',
      zipCode: site.zipCode ?? '',
    })
    setErrors({})
    setSubmitError('')
    setResult(null)
  }, [visible, site])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev))
  }

  function handlePickAddress(item) {
    setForm((prev) => ({ ...prev, address: item.address, zipCode: item.zipCode ?? '' }))
    setErrors((prev) => (prev.address ? { ...prev, address: '' } : prev))
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = '현장명을 입력해주세요.'
    if (!form.address.trim()) next.address = '주소를 입력해주세요.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // 저장 전 항상 한 번 확인받는다(삭제/복구뿐 아니라 모든 변경에 통일된 흐름)
  function handleSubmit(event) {
    event?.preventDefault()
    setSubmitError('')
    if (!validate()) return
    setConfirmOpen(true)
  }

  async function handleConfirmSubmit() {
    setConfirmOpen(false)
    setSubmitting(true)
    try {
      const updated = await updateSite(site.siteId, {
        name: form.name.trim(),
        address: form.address.trim(),
        addressDetail: form.addressDetail.trim() || null,
        zipCode: form.zipCode.trim() || null,
      })
      setResult({ name: updated?.name ?? form.name, site: updated })
    } catch (error) {
      setSubmitError(error?.response?.data?.resultMessage ?? '현장 수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleResultClose() {
    const updatedSite = result?.site
    setResult(null)
    onUpdated?.(updatedSite)
    onClose()
  }

  async function handleDelete() {
    await deleteSite(site.siteId)
    setDeleteConfirmOpen(false)
    setDeleteResult({ name: site.name })
  }

  function handleDeleteResultClose() {
    const deletedName = deleteResult?.name
    setDeleteResult(null)
    onDeleted?.({ name: deletedName, siteId: site.siteId })
    onClose()
  }

  const footer = (
    <div className="site-modal__footer-row">
      <Button type="button" variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
        삭제
      </Button>
      <div className="site-modal__footer-actions">
        <Button type="button" variant="secondary" onClick={onClose}>
          취소
        </Button>
        <Button type="button" variant="primary" loading={submitting} onClick={handleSubmit}>
          저장
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <BaseModal
        visible={visible && !result && !deleteResult}
        onClose={onClose}
        title="현장 수정"
        className="modal-panel--wide"
        footer={footer}
      >
        <form onSubmit={handleSubmit} className="site-form__body">
          {submitError && (
            <div className="banner banner-danger" role="alert">
              {submitError}
            </div>
          )}

          <fieldset className="site-form__group">
            <legend className="site-form__legend site-form__section-head">
              현장 정보
              <span className="site-form__legend-desc">
                담당 직원과 현장관리자 계정은 직원관리에서 변경합니다. <span className="field-required">*</span> 표시는 필수
                항목입니다.
              </span>
            </legend>
            <div className="site-form__row-2-1">
              <Input
                label="현장명"
                requiredMark
                value={form.name}
                error={errors.name}
                onChange={(event) => updateField('name', event.target.value)}
              />
              <Input
                label="우편번호"
                value={form.zipCode}
                onChange={(event) => updateField('zipCode', event.target.value)}
              />
            </div>
            <div className="site-form__row-2-1">
              <Input
                label="주소"
                requiredMark
                readOnly
                placeholder="주소 검색으로 입력해주세요"
                value={form.address}
                error={errors.address}
              />
              <Button type="button" variant="secondary" onClick={() => setAddressSearchOpen(true)}>
                주소 검색
              </Button>
            </div>
            <Input
              label="상세주소"
              placeholder="예: 5층 501호"
              value={form.addressDetail}
              onChange={(event) => updateField('addressDetail', event.target.value)}
            />
          </fieldset>
        </form>
      </BaseModal>

      <AddressSearchModal
        visible={addressSearchOpen}
        onClose={() => setAddressSearchOpen(false)}
        onSelect={handlePickAddress}
      />

      <ConfirmModal
        visible={confirmOpen}
        title="현장 수정"
        message="입력한 내용으로 현장 정보를 수정하시겠습니까?"
        confirmLabel="수정"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setConfirmOpen(false)}
      >
        <div className="confirm-modal__summary confirm-modal__summary--neutral">
          <span className="confirm-modal__summary-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="confirm-modal__summary-body">
            <p className="confirm-modal__summary-row">
              <span className="confirm-modal__summary-label">현장명</span>
              <span className="confirm-modal__summary-value">{form.name}</span>
              <span className="confirm-modal__summary-badge">수정</span>
            </p>
            <p className="confirm-modal__summary-detail">주소·우편번호도 입력한 내용으로 함께 저장됩니다.</p>
          </div>
        </div>
      </ConfirmModal>

      <ConfirmModal
        visible={deleteConfirmOpen}
        danger
        overlayTop
        title="현장 삭제"
        message="이 현장을 삭제하시겠습니까?"
        confirmLabel="삭제"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
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
              <span className="confirm-modal__summary-label">현장명</span>
              <span className="confirm-modal__summary-value">{site?.name}</span>
              <span className="confirm-modal__summary-badge">삭제</span>
            </p>
            <p className="confirm-modal__summary-detail">
              상태를 삭제로 변경 · 삭제된 현장은 현장 선택 목록에서 제외됩니다{site?.address ? ` · ${site.address}` : ''}
            </p>
          </div>
        </div>
      </ConfirmModal>

      <ActionResultModal
        visible={Boolean(result)}
        type="success"
        title="수정이 완료되었습니다."
        subtitle="변경된 현장 정보가 저장되었습니다."
        desc="수정된 내용은 즉시 반영됩니다."
        infoRows={[
          { label: '수정 항목', value: result?.name },
          { label: '수정 시각', value: formatResultDateTime() },
          { label: '수정자', value: user?.name },
        ]}
        onClose={handleResultClose}
      />

      <ActionResultModal
        visible={Boolean(deleteResult)}
        type="success"
        title="삭제가 완료되었습니다."
        subtitle="선택한 현장이 삭제되었습니다."
        infoRows={[
          { label: '삭제 항목', value: deleteResult?.name },
          { label: '삭제 시각', value: formatResultDateTime() },
          { label: '삭제자', value: user?.name },
        ]}
        onClose={handleDeleteResultClose}
      />
    </>
  )
}
